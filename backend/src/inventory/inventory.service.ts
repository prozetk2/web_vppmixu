import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockQueryDto, AdjustStockDto, MovementQueryDto, MovementType, InventoryReportDto, BulkAdjustStockDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
    constructor(private readonly prisma: PrismaService) { }

    private getMovementDelta(movementType: string, quantity: number) {
        const absoluteQuantity = Math.abs(quantity);

        switch (movementType) {
            case 'IMPORT':
            case 'PURCHASE':
            case 'RETURN':
                return absoluteQuantity;
            case 'EXPORT':
            case 'SALE':
                return -absoluteQuantity;
            case 'ADJUST':
                return quantity;
            default:
                return quantity;
        }
    }

    private getNormalizedMovementType(movementType: string, quantity: number) {
        if (movementType === 'SALE') {
            return 'EXPORT';
        }

        if (movementType === 'RETURN' || movementType === 'PURCHASE') {
            return 'IMPORT';
        }

        if (movementType === 'ADJUST') {
            return quantity >= 0 ? 'IMPORT' : 'EXPORT';
        }

        return movementType;
    }

    private getMovementLabel(movementType: string, quantity: number) {
        switch (movementType) {
            case 'IMPORT':
                return 'Nhập kho';
            case 'PURCHASE':
                return 'Nhập hàng';
            case 'EXPORT':
                return 'Xuất kho';
            case 'SALE':
                return 'Bán hàng';
            case 'RETURN':
                return 'Trả hàng';
            case 'ADJUST':
                return quantity >= 0 ? 'Điều chỉnh tăng' : 'Điều chỉnh giảm';
            default:
                return movementType;
        }
    }

    private extractReferenceCode(reference?: string | null, note?: string | null) {
        if (reference?.trim()) {
            return reference.trim();
        }

        if (!note) {
            return null;
        }

        const matched = note.match(/(?:Bán hàng|Trả hàng|Xuất kho cho|Nhập hàng)\s*:\s*([A-Z0-9-]+)/i);
        return matched?.[1]?.trim() || null;
    }

    private matchMovementToInvoiceItem(
        movement: {
            variant: {
                sku?: string | null;
                product: { sku?: string | null; name: string };
            };
        },
        item: {
            productCode?: string | null;
            productName?: string | null;
        },
    ) {
        const movementCodes = [movement.variant.sku, movement.variant.product.sku]
            .filter(Boolean)
            .map((code) => String(code).trim().toLowerCase());
        const itemCode = item.productCode?.trim().toLowerCase();

        if (itemCode && movementCodes.includes(itemCode)) {
            return true;
        }

        return (item.productName || '').trim().toLowerCase() === movement.variant.product.name.trim().toLowerCase();
    }

    private getProductBaseUnit(product: { baseUnitCode?: string | null; unit?: string | null }) {
        return product.baseUnitCode?.trim() || product.unit?.trim() || 'Cái';
    }

    private getProductDisplayUnit(product: { baseUnitCode?: string | null; unit?: string | null }) {
        return product.unit?.trim() || this.getProductBaseUnit(product);
    }

    private getProductConversionRate(product: { conversionRate?: Prisma.Decimal | number | null }) {
        const conversionRate = Number(product.conversionRate || 1);
        return Number.isFinite(conversionRate) && conversionRate > 0 ? conversionRate : 1;
    }

    private deriveDisplayQuantity(
        baseQuantity: number,
        product: { baseUnitCode?: string | null; unit?: string | null; conversionRate?: Prisma.Decimal | number | null },
        preferredUnit?: string | null,
    ) {
        const absoluteBaseQuantity = Math.abs(baseQuantity);
        const baseUnit = this.getProductBaseUnit(product);
        const displayUnit = this.getProductDisplayUnit(product);
        const conversionRate = this.getProductConversionRate(product);
        const normalizedPreferredUnit = preferredUnit?.trim();

        if (normalizedPreferredUnit && normalizedPreferredUnit === baseUnit) {
            return {
                baseUnit,
                displayUnit: baseUnit,
                displayQuantity: absoluteBaseQuantity,
                conversionRate: 1,
            };
        }

        if (displayUnit !== baseUnit && conversionRate > 1) {
            return {
                baseUnit,
                displayUnit,
                displayQuantity: absoluteBaseQuantity / conversionRate,
                conversionRate,
            };
        }

        return {
            baseUnit,
            displayUnit: normalizedPreferredUnit || baseUnit,
            displayQuantity: absoluteBaseQuantity,
            conversionRate: 1,
        };
    }

    /**
     * Get stock levels with optional filters
     */
    async getStock(query: StockQueryDto) {
        const { warehouseId, productId, search, page = 1, limit = 20 } = query;

        // Build where clause for inventory
        const where: Prisma.InventoryWhereInput = {};

        if (warehouseId) {
            where.warehouseId = BigInt(warehouseId);
        }

        // Build complex query to join Product data
        const inventoryRecords = await this.prisma.inventory.findMany({
            where,
            include: {
                warehouse: true,
                variant: {
                    include: {
                        product: {
                            include: {
                                category: true,
                            },
                        },
                    },
                },
            },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { updatedAt: 'desc' },
        });

        // Filter by productId or search if specified
        let filtered = inventoryRecords;

        if (productId) {
            filtered = filtered.filter(
                (inv) => inv.variant.productId === BigInt(productId),
            );
        }

        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(
                (inv) =>
                    inv.variant.product.name.toLowerCase().includes(searchLower) ||
                    inv.variant.sku?.toLowerCase().includes(searchLower) ||
                    inv.variant.barcode?.toLowerCase().includes(searchLower),
            );
        }

        // Transform to response format
        const data = filtered.map((inv) => ({
            id: inv.id.toString(),
            warehouseId: inv.warehouseId.toString(),
            warehouseName: inv.warehouse.name,
            warehouseCode: inv.warehouse.code,
            productId: inv.variant.productId.toString(),
            productName: inv.variant.product.name,
            sku: inv.variant.sku || inv.variant.product.sku,
            barcode: inv.variant.barcode,
            categoryName: inv.variant.product.category?.name || null,
            quantity: Number(inv.quantity),
            reserved: Number(inv.reserved),
            available: Number(inv.quantity) - Number(inv.reserved),
            updatedAt: inv.updatedAt,
        }));

        const total = await this.prisma.inventory.count({ where });

        return {
            data,
            meta: { page, limit, total },
        };
    }

    /**
     * Adjust stock (IMPORT, EXPORT, ADJUST)
     * Uses transaction to ensure data integrity
     */
    async adjustStock(dto: AdjustStockDto, performedBy?: bigint) {
        const {
            warehouseId,
            productId,
            quantity,
            type,
            note,
            reference,
            storeId,
            unit,
            displayQuantity,
            displayUnit,
            referenceType,
            referenceId,
            referenceCode,
        } = dto;

        // Validate warehouse exists
        const warehouse = await this.prisma.warehouse.findUnique({
            where: { id: BigInt(warehouseId) },
        });
        if (!warehouse) {
            throw new NotFoundException('WAREHOUSE_NOT_FOUND');
        }

        // Validate product exists and get/create default variant
        const product = await this.prisma.product.findUnique({
            where: { id: BigInt(productId) },
            include: { variants: true },
        });
        if (!product) {
            throw new NotFoundException('PRODUCT_NOT_FOUND');
        }

        // Get or create default variant for this product
        let variant = product.variants[0];
        if (!variant) {
            variant = await this.prisma.productVariant.create({
                data: {
                    productId: BigInt(productId),
                    sku: product.sku,
                    price: product.defaultPrice,
                    cost: product.defaultCost,
                    active: true,
                },
            });
        }

        // Execute in transaction
        return this.prisma.$transaction(async (tx) => {
            // Get or create inventory record
            let inventory = await tx.inventory.findFirst({
                where: {
                    warehouseId: BigInt(warehouseId),
                    variantId: variant.id,
                },
            });

            if (!inventory) {
                inventory = await tx.inventory.create({
                    data: {
                        warehouseId: BigInt(warehouseId),
                        variantId: variant.id,
                        quantity: 0,
                        reserved: 0,
                    },
                });
            }

            // Calculate new quantity based on movement type
            let newQuantity: bigint;
            let movementQuantity: bigint;

            switch (type) {
                case MovementType.IMPORT:
                    newQuantity = inventory.quantity + BigInt(quantity);
                    movementQuantity = BigInt(quantity);
                    break;

                case MovementType.EXPORT:
                    if (inventory.quantity < BigInt(quantity)) {
                        throw new BadRequestException('INSUFFICIENT_STOCK');
                    }
                    newQuantity = inventory.quantity - BigInt(quantity);
                    movementQuantity = BigInt(quantity);
                    break;

                case MovementType.ADJUST:
                    // For ADJUST, quantity is the new absolute value
                    newQuantity = BigInt(quantity);
                    movementQuantity = BigInt(quantity) - inventory.quantity;
                    break;

                default:
                    throw new BadRequestException('INVALID_MOVEMENT_TYPE');
            }

            // Update inventory
            const updatedInventory = await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                    quantity: newQuantity,
                    updatedAt: new Date(),
                },
            });

            // Calculate unit cost from DTO or product default
            const unitCost = dto.unitCost ?? Number(product.defaultCost || product.defaultPrice || 0);
            const movementBaseQuantity = Math.abs(Number(movementQuantity));
            const persistedDisplayUnit = displayUnit || unit || this.getProductBaseUnit(product);
            const persistedDisplayQuantity = displayQuantity ?? movementBaseQuantity;

            // Create stock movement record
            // ADJUST type should also set toWarehouseId so it appears in warehouse-filtered reports
            const movement = await tx.stockMovement.create({
                data: {
                    movementType: type,
                    reference: reference || referenceCode || null,
                    referenceType: referenceType || null,
                    referenceId: referenceId ? BigInt(referenceId) : null,
                    referenceCode: referenceCode || reference || null,
                    variantId: variant.id,
                    fromWarehouseId: type === MovementType.EXPORT ? BigInt(warehouseId) : null,
                    toWarehouseId: (type === MovementType.IMPORT || type === MovementType.ADJUST) ? BigInt(warehouseId) : null,
                    // For ADJUST, keep the sign (positive=increase, negative=decrease)
                    // For IMPORT/EXPORT, always use positive quantity
                    quantity: type === MovementType.ADJUST
                        ? movementQuantity  // Keep sign for ADJUST
                        : (movementQuantity > 0 ? movementQuantity : -movementQuantity),
                    displayQuantity: persistedDisplayQuantity,
                    displayUnit: persistedDisplayUnit,
                    unitCost: unitCost,
                    performedBy: performedBy || null,
                    note: note || null,
                    storeId: storeId ? BigInt(storeId) : null,
                },
            });

            return {
                inventory: {
                    id: updatedInventory.id.toString(),
                    quantity: Number(updatedInventory.quantity),
                },
                movement: {
                    id: movement.id.toString(),
                    type: movement.movementType,
                    quantity: Number(movement.quantity),
                },
            };
        });
    }

    /**
     * Get stock movement history
     */
    async getMovements(query: MovementQueryDto) {
        const { warehouseId, productId, type, storeId, fromDate, toDate, page = 1, limit = 20 } = query;

        const where: Prisma.StockMovementWhereInput = {};

        if (warehouseId) {
            where.OR = [
                { fromWarehouseId: BigInt(warehouseId) },
                { toWarehouseId: BigInt(warehouseId) },
            ];
        }

        if (storeId) {
            where.storeId = BigInt(storeId);
        }

        if (productId) {
            where.variant = {
                productId: BigInt(productId),
            };
        }

        if (type) {
            if (type === 'IMPORT') {
                where.movementType = { in: ['IMPORT', 'PURCHASE', 'RETURN'] };
            } else if (type === 'EXPORT') {
                where.movementType = { in: ['EXPORT', 'SALE'] };
            } else {
                where.movementType = type;
            }
        }

        if (fromDate || toDate) {
            where.performedAt = {};
            if (fromDate) {
                where.performedAt.gte = new Date(fromDate);
            }
            if (toDate) {
                where.performedAt.lte = new Date(toDate);
            }
        }

        const [movements, total] = await Promise.all([
            this.prisma.stockMovement.findMany({
                where,
                include: {
                    variant: {
                        include: {
                            product: true,
                        },
                    },
                    fromWarehouse: true,
                    toWarehouse: true,
                    performer: true,
                    store: true,
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { performedAt: 'desc' },
            }),
            this.prisma.stockMovement.count({ where }),
        ]);

        const movementReferences = Array.from(
            new Set(
                movements
                    .map((movement) => movement.referenceCode || this.extractReferenceCode(movement.reference, movement.note))
                    .filter((reference): reference is string => Boolean(reference)),
            ),
        );

        const invoices = movementReferences.length > 0
            ? await this.prisma.invoice.findMany({
                where: {
                    OR: [
                        { invoiceNumber: { in: movementReferences } },
                        { orderCode: { in: movementReferences } },
                    ],
                },
                include: {
                    items: true,
                    store: true,
                },
            })
            : [];

        const invoiceMap = new Map<string, (typeof invoices)[number]>();
        invoices.forEach((invoice) => {
            if (invoice.invoiceNumber) {
                invoiceMap.set(invoice.invoiceNumber, invoice);
            }
            if (invoice.orderCode) {
                invoiceMap.set(invoice.orderCode, invoice);
            }
        });

        const data = movements.map((m) => {
            const signedQuantity = this.getMovementDelta(m.movementType, Number(m.quantity));
            const referenceCode = m.referenceCode || this.extractReferenceCode(m.reference, m.note);
            const relatedInvoice = referenceCode ? invoiceMap.get(referenceCode) : undefined;
            const relatedInvoiceItem = relatedInvoice?.items.find((item) =>
                this.matchMovementToInvoiceItem(m, item),
            );
            const derivedDisplay = this.deriveDisplayQuantity(signedQuantity, m.variant.product, m.displayUnit);
            const resolvedDisplayUnit =
                m.displayUnit ||
                relatedInvoiceItem?.unit ||
                derivedDisplay.displayUnit;
            const resolvedDisplayQuantity =
                m.displayQuantity !== null && m.displayQuantity !== undefined
                    ? Number(m.displayQuantity)
                    : relatedInvoiceItem?.quantity
                        ? Number(relatedInvoiceItem.quantity)
                        : derivedDisplay.displayQuantity;

            return {
                id: m.id.toString(),
                type: m.movementType,
                normalizedType: this.getNormalizedMovementType(m.movementType, Number(m.quantity)),
                label: this.getMovementLabel(m.movementType, Number(m.quantity)),
                direction: signedQuantity >= 0 ? 'IN' : 'OUT',
                productId: m.variant.productId.toString(),
                productName: m.variant.product.name,
                sku: m.variant.sku || m.variant.product.sku,
                unit: resolvedDisplayUnit,
                displayUnit: resolvedDisplayUnit,
                displayQuantity: resolvedDisplayQuantity,
                quantity: resolvedDisplayQuantity,
                baseUnit: this.getProductBaseUnit(m.variant.product),
                baseQuantity: Math.abs(signedQuantity),
                signedQuantity,
                conversionRate: resolvedDisplayUnit === this.getProductBaseUnit(m.variant.product)
                    ? 1
                    : derivedDisplay.conversionRate,
                fromWarehouse: m.fromWarehouse
                    ? { id: m.fromWarehouse.id.toString(), name: m.fromWarehouse.name }
                    : null,
                toWarehouse: m.toWarehouse
                    ? { id: m.toWarehouse.id.toString(), name: m.toWarehouse.name }
                    : null,
                unitCost: Number(m.unitCost || 0),
                storeName: m.store?.name || relatedInvoice?.store?.name || null,
                customerName: relatedInvoice?.customerName || (relatedInvoice ? 'Khách lẻ' : null),
                customerPhone: relatedInvoice?.customerPhone || null,
                performedBy: m.performer?.fullName || m.performer?.username || null,
                performedAt: m.performedAt,
                note: m.note,
                referenceType: m.referenceType,
                referenceId: m.referenceId?.toString() || null,
                reference: referenceCode,
                referenceCode,
                rawReference: m.reference,
                documentNumber: relatedInvoice?.invoiceNumber || relatedInvoice?.orderCode || referenceCode,
            };
        });

        return {
            data,
            meta: { page, limit, total },
        };
    }

    /**
     * Get inventory report with period-based calculations
     * Shows: Đầu kỳ, Nhập kho, Xuất kho, Cuối kỳ
     */
    async getInventoryReport(query: InventoryReportDto) {
        const { fromDate, toDate, warehouseId, storeId, search, page = 1, limit = 20 } = query;

        // Default date range: current month
        const now = new Date();
        const periodStart = fromDate ? new Date(fromDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = toDate ? new Date(toDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Build where clause for products
        const productWhere: any = {};
        if (search) {
            productWhere.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Get total count first (for pagination)
        const totalProducts = await this.prisma.product.count({ where: productWhere });
        console.log('[Inventory Report] Query params:', { page, limit, search, warehouseId });
        console.log('[Inventory Report] Total products in database:', totalProducts);

        // Get paginated products with their variants
        const products: any[] = await this.prisma.product.findMany({
            where: productWhere,
            include: {
                variants: {
                    include: {
                        inventory: warehouseId
                            ? { where: { warehouseId: BigInt(warehouseId) } }
                            : true,
                    },
                },
            },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { name: 'asc' },
        });

        // Get all stock movements in period
        // Need to use AND to properly combine date filter with warehouse OR
        const movementsWhere: Prisma.StockMovementWhereInput = {
            AND: [
                {
                    performedAt: {
                        gte: periodStart,
                        lte: periodEnd,
                    },
                },
                ...(warehouseId ? [{
                    OR: [
                        { fromWarehouseId: BigInt(warehouseId) },
                        { toWarehouseId: BigInt(warehouseId) },
                    ],
                }] : []),
                ...(storeId ? [{ storeId: BigInt(storeId) }] : []),
            ],
        };

        const movements = await this.prisma.stockMovement.findMany({
            where: movementsWhere,
            include: {
                variant: true,
            },
        });

        // Get movements before period start for beginning balance
        // Use same AND + OR pattern for consistent filtering
        const priorMovementsWhere: Prisma.StockMovementWhereInput = {
            AND: [
                { performedAt: { lt: periodStart } },
                ...(warehouseId ? [{
                    OR: [
                        { fromWarehouseId: BigInt(warehouseId) },
                        { toWarehouseId: BigInt(warehouseId) },
                    ],
                }] : []),
                ...(storeId ? [{ storeId: BigInt(storeId) }] : []),
            ],
        };

        const priorMovements = await this.prisma.stockMovement.findMany({
            where: priorMovementsWhere,
            include: {
                variant: true,
            },
        });

        // Get movements AFTER period end for backwards calculation from current inventory
        const postMovementsWhere: Prisma.StockMovementWhereInput = {
            AND: [
                { performedAt: { gt: periodEnd } },
                ...(warehouseId ? [{
                    OR: [
                        { fromWarehouseId: BigInt(warehouseId) },
                        { toWarehouseId: BigInt(warehouseId) },
                    ],
                }] : []),
                ...(storeId ? [{ storeId: BigInt(storeId) }] : []),
            ],
        };

        const postMovements = await this.prisma.stockMovement.findMany({
            where: postMovementsWhere,
            include: {
                variant: true,
            },
        });

        // Calculate report data for each product
        const reportData = products.map((product) => {
            const variantIds = product.variants.map((v) => v.id);

            // Calculate current total inventory for these variants
            let currentTotalQty = 0;
            product.variants.forEach((v) => {
                if (v.inventory && v.inventory.length > 0) {
                    currentTotalQty += v.inventory.reduce((sum, inv) => sum + Number(inv.quantity), 0);
                }
            });

            // Calculate historical sum from prior movements
            let historicalBeginningQty = 0;
            priorMovements
                .filter((m) => variantIds.includes(m.variantId))
                .forEach((m) => {
                    historicalBeginningQty += this.getMovementDelta(m.movementType, Number(m.quantity));
                });

            // Calculate period imports and exports
            let importQty = 0;
            let exportQty = 0;

            movements
                .filter((m) => variantIds.includes(m.variantId))
                .forEach((m) => {
                    const movementDelta = this.getMovementDelta(m.movementType, Number(m.quantity));

                    if (movementDelta > 0) {
                        importQty += movementDelta;
                    } else if (movementDelta < 0) {
                        exportQty += Math.abs(movementDelta);
                    }
                });

            // Calculate net movements AFTER this period up to now
            let postPeriodNetQty = 0;
            postMovements
                .filter((m) => variantIds.includes(m.variantId))
                .forEach((m) => {
                    postPeriodNetQty += this.getMovementDelta(m.movementType, Number(m.quantity));
                });

            // Identify initial stock without movements
            const allTimeMovementsSum = historicalBeginningQty + importQty - exportQty + postPeriodNetQty;
            const initialStockWithoutMovement = currentTotalQty - allTimeMovementsSum;

            // The true beginning quantity
            const beginningQty = historicalBeginningQty + initialStockWithoutMovement;

            // Calculate ending balance
            const endingQty = beginningQty + importQty - exportQty;

            // Get unit cost for value calculation
            const unitCost = Number(product.defaultCost || product.defaultPrice || 0);
            const baseUnit = this.getProductBaseUnit(product);
            const displayUnit = this.getProductDisplayUnit(product);
            const conversionRate = this.getProductConversionRate(product);
            const hasDisplayConversion = displayUnit !== baseUnit && conversionRate > 1;
            const toDisplayQty = (qty: number) =>
                hasDisplayConversion ? qty / conversionRate : qty;

            return {
                id: product.id.toString(),
                productCode: product.sku || '',
                productName: product.name,
                unit: baseUnit,
                baseUnit,
                displayUnit,
                conversionRate,
                beginningDisplayQty: toDisplayQty(beginningQty),
                beginningQty,
                beginningValue: beginningQty * unitCost,
                importDisplayQty: toDisplayQty(importQty),
                importQty,
                importValue: importQty * unitCost,
                exportDisplayQty: toDisplayQty(exportQty),
                exportQty,
                exportValue: exportQty * unitCost,
                endingDisplayQty: toDisplayQty(endingQty),
                endingQty,
                endingValue: endingQty * unitCost,
                unitCost,
            };
        });

        // Calculate totals
        const totals = reportData.reduce(
            (acc, p) => ({
                beginningQty: acc.beginningQty + p.beginningQty,
                beginningValue: acc.beginningValue + p.beginningValue,
                importQty: acc.importQty + p.importQty,
                importValue: acc.importValue + p.importValue,
                exportQty: acc.exportQty + p.exportQty,
                exportValue: acc.exportValue + p.exportValue,
                endingQty: acc.endingQty + p.endingQty,
                endingValue: acc.endingValue + p.endingValue,
            }),
            {
                beginningQty: 0,
                beginningValue: 0,
                importQty: 0,
                importValue: 0,
                exportQty: 0,
                exportValue: 0,
                endingQty: 0,
                endingValue: 0,
            },
        );

        return {
            data: reportData,
            totals,
            meta: { page, limit, total: totalProducts },
            period: {
                from: periodStart.toISOString(),
                to: periodEnd.toISOString(),
            },
        };
    }

    /**
     * Bulk adjust stock from Excel import
     */
    async bulkAdjustStock(dto: BulkAdjustStockDto, performedBy?: bigint) {
        console.log('bulkAdjustStock called with', dto.items?.length, 'items');

        if (!dto.items || dto.items.length === 0) {
            return {
                success: false,
                processed: 0,
                successCount: 0,
                failCount: 0,
                results: [],
                error: 'No items provided',
            };
        }

        const results: { success: boolean; productCode: string; message?: string }[] = [];

        for (const item of dto.items) {
            try {
                // Find product by code/sku
                const product = await this.prisma.product.findFirst({
                    where: {
                        OR: [
                            { sku: item.productCode },
                            { name: item.productName || '' },
                        ],
                    },
                    include: { variants: true },
                });

                if (!product) {
                    results.push({
                        success: false,
                        productCode: item.productCode,
                        message: 'Không tìm thấy sản phẩm',
                    });
                    continue;
                }

                // Use existing adjustStock method
                await this.adjustStock(
                    {
                        warehouseId: item.warehouseId,
                        productId: product.id.toString(),
                        quantity: item.quantity,
                        type: item.type,
                        note: item.note || `Bulk ${item.type.toLowerCase()}`,
                        storeId: item.storeId,
                        unit: item.unit,
                        displayQuantity: item.displayQuantity ?? item.quantity,
                        displayUnit: item.displayUnit || item.unit,
                        referenceType: item.referenceType,
                        referenceId: item.referenceId,
                        referenceCode: item.referenceCode,
                    },
                    performedBy,
                );

                results.push({
                    success: true,
                    productCode: item.productCode,
                });
            } catch (error: any) {
                results.push({
                    success: false,
                    productCode: item.productCode,
                    message: error.message || 'Có lỗi xảy ra',
                });
            }
        }

        const successCount = results.filter((r) => r.success).length;
        const failCount = results.length - successCount;

        return {
            success: failCount === 0,
            processed: results.length,
            successCount,
            failCount,
            results,
        };
    }

    /**
     * Deduct inventory when selling products (e.g., from Invoice)
     * Validates stock availability before deducting
     */
    async deductInventoryFromSale(
        items: Array<{
            productCode: string;
            quantity: number;
            unitPrice?: number;
            unit?: string;
            displayQuantity?: number;
            referenceType?: string;
            referenceId?: string;
            referenceCode?: string;
        }>,
        reference: string,  // e.g., "INV-001"
        warehouseId?: string,
        storeId?: string,
        performedBy?: bigint,
    ): Promise<{ success: boolean; deductedItems: number }> {
        let deductedItems = 0;

        for (const item of items) {
            // Find product by SKU
            const product = await this.prisma.product.findFirst({
                where: { sku: item.productCode },
                include: { variants: { include: { inventory: true } } },
            });

            if (!product) {
                console.warn(`Product not found: ${item.productCode}, skipping inventory deduct`);
                continue;
            }

            // Get variant
            const variant = product.variants[0];
            if (!variant) {
                console.warn(`No variant found for product: ${item.productCode}`);
                continue;
            }

            // Get default warehouse if not specified
            let targetWarehouseId = warehouseId;
            if (!targetWarehouseId) {
                const defaultWarehouse = await this.prisma.warehouse.findFirst({
                    orderBy: { id: 'asc' },
                });
                if (!defaultWarehouse) {
                    throw new Error('No warehouse available');
                }
                targetWarehouseId = defaultWarehouse.id.toString();
            }

            // Check stock availability
            const inventory = await this.prisma.inventory.findFirst({
                where: {
                    variantId: variant.id,
                    warehouseId: BigInt(targetWarehouseId),
                },
            });

            if (!inventory || inventory.quantity < BigInt(item.quantity)) {
                throw new Error(
                    `Insufficient stock for ${item.productCode}. Available: ${inventory?.quantity || 0}, Required: ${item.quantity}`
                );
            }

            // Deduct stock
            await this.adjustStock(
                {
                    warehouseId: targetWarehouseId,
                    productId: product.id.toString(),
                    quantity: item.quantity,
                    type: MovementType.EXPORT,
                    reference,
                    note: `Xuất kho cho ${reference}`,
                    storeId: storeId,
                    displayQuantity: item.displayQuantity ?? item.quantity,
                    displayUnit: item.unit,
                    referenceType: item.referenceType,
                    referenceId: item.referenceId,
                    referenceCode: item.referenceCode || reference,
                    unitCost: item.unitPrice, // Use sale price as cost reference
                },
                performedBy,
            );

            deductedItems++;
        }

        return { success: true, deductedItems };
    }
}
