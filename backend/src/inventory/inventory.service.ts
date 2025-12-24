import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockQueryDto, AdjustStockDto, MovementQueryDto, MovementType, InventoryReportDto, BulkAdjustStockDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
    constructor(private readonly prisma: PrismaService) { }

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
        const { warehouseId, productId, quantity, type, note, storeId } = dto;

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

            // Create stock movement record
            const movement = await tx.stockMovement.create({
                data: {
                    movementType: type,
                    variantId: variant.id,
                    fromWarehouseId: type === MovementType.EXPORT ? BigInt(warehouseId) : null,
                    toWarehouseId: type === MovementType.IMPORT ? BigInt(warehouseId) : null,
                    quantity: movementQuantity > 0 ? movementQuantity : -movementQuantity,
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

        if (type) {
            where.movementType = type;
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
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { performedAt: 'desc' },
            }),
            this.prisma.stockMovement.count({ where }),
        ]);

        // Filter by productId if specified (post-filter due to nested relation)
        let filtered = movements;
        if (productId) {
            filtered = filtered.filter(
                (m) => m.variant.productId === BigInt(productId),
            );
        }

        const data = filtered.map((m) => ({
            id: m.id.toString(),
            type: m.movementType,
            productId: m.variant.productId.toString(),
            productName: m.variant.product.name,
            sku: m.variant.sku,
            fromWarehouse: m.fromWarehouse
                ? { id: m.fromWarehouse.id.toString(), name: m.fromWarehouse.name }
                : null,
            toWarehouse: m.toWarehouse
                ? { id: m.toWarehouse.id.toString(), name: m.toWarehouse.name }
                : null,
            quantity: Number(m.quantity),
            performedBy: m.performer?.fullName || m.performer?.username || null,
            performedAt: m.performedAt,
            note: m.note,
            reference: m.reference,
        }));

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
        const { fromDate, toDate, warehouseId, storeId, search, page = 1, limit = 50 } = query;

        // Default date range: current month
        const now = new Date();
        const periodStart = fromDate ? new Date(fromDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = toDate ? new Date(toDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Get all products with their variants
        const productsQuery: any = {
            include: {
                variants: {
                    include: {
                        inventory: warehouseId
                            ? { where: { warehouseId: BigInt(warehouseId) } }
                            : true,
                    },
                },
            },
        };

        if (search) {
            productsQuery.where = {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { sku: { contains: search, mode: 'insensitive' } },
                ],
            };
        }

        const products: any[] = await this.prisma.product.findMany(productsQuery);

        // Get all stock movements in period
        const movementsWhere: Prisma.StockMovementWhereInput = {
            performedAt: {
                gte: periodStart,
                lte: periodEnd,
            },
        };

        if (warehouseId) {
            movementsWhere.OR = [
                { fromWarehouseId: BigInt(warehouseId) },
                { toWarehouseId: BigInt(warehouseId) },
            ];
        }

        if (storeId) {
            movementsWhere.storeId = BigInt(storeId);
        }

        const movements = await this.prisma.stockMovement.findMany({
            where: movementsWhere,
            include: {
                variant: true,
            },
        });

        // Get movements before period start for beginning balance
        const priorMovementsWhere: Prisma.StockMovementWhereInput = {
            performedAt: { lt: periodStart },
        };

        if (warehouseId) {
            priorMovementsWhere.OR = [
                { fromWarehouseId: BigInt(warehouseId) },
                { toWarehouseId: BigInt(warehouseId) },
            ];
        }

        if (storeId) {
            priorMovementsWhere.storeId = BigInt(storeId);
        }

        const priorMovements = await this.prisma.stockMovement.findMany({
            where: priorMovementsWhere,
            include: {
                variant: true,
            },
        });

        // Calculate report data for each product
        const reportData = products.map((product) => {
            const variantIds = product.variants.map((v) => v.id);

            // Calculate beginning balance (movements before period)
            let beginningQty = 0;
            priorMovements
                .filter((m) => variantIds.includes(m.variantId))
                .forEach((m) => {
                    if (m.movementType === 'IMPORT' || m.movementType === 'ADJUST') {
                        beginningQty += Number(m.quantity);
                    } else if (m.movementType === 'EXPORT') {
                        beginningQty -= Number(m.quantity);
                    }
                });

            // Calculate period imports
            let importQty = 0;
            movements
                .filter((m) => variantIds.includes(m.variantId) && m.movementType === 'IMPORT')
                .forEach((m) => {
                    importQty += Number(m.quantity);
                });

            // Calculate period exports
            let exportQty = 0;
            movements
                .filter((m) => variantIds.includes(m.variantId) && m.movementType === 'EXPORT')
                .forEach((m) => {
                    exportQty += Number(m.quantity);
                });

            // Calculate adjustments in period
            movements
                .filter((m) => variantIds.includes(m.variantId) && m.movementType === 'ADJUST')
                .forEach((m) => {
                    // Positive adjustment = import, negative = export
                    if (Number(m.quantity) > 0) {
                        importQty += Number(m.quantity);
                    } else {
                        exportQty += Math.abs(Number(m.quantity));
                    }
                });

            // Calculate ending balance
            const endingQty = beginningQty + importQty - exportQty;

            // Get unit cost for value calculation
            const unitCost = Number(product.defaultCost || product.defaultPrice || 0);

            return {
                id: product.id.toString(),
                productCode: product.sku || '',
                productName: product.name,
                unit: 'Cái', // Default unit - could be extended with unit model
                beginningQty,
                beginningValue: beginningQty * unitCost,
                importQty,
                importValue: importQty * unitCost,
                exportQty,
                exportValue: exportQty * unitCost,
                endingQty,
                endingValue: endingQty * unitCost,
                unitCost,
            };
        });

        // NO FILTER - Show ALL products including zero stock
        // const activeProducts = reportData.filter(...);  // REMOVED

        // Pagination
        const total = reportData.length;
        const paginatedData = reportData.slice((page - 1) * limit, page * limit);

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
            data: paginatedData,
            totals,
            meta: { page, limit, total },
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

        // Log first few items for debugging
        console.log('First 3 items:', dto.items.slice(0, 3));

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
                    note: `Xuất kho cho ${reference}`,
                    storeId: storeId,
                    unitCost: item.unitPrice, // Use sale price as cost reference
                },
                performedBy,
            );

            deductedItems++;
        }

        return { success: true, deductedItems };
    }
}
