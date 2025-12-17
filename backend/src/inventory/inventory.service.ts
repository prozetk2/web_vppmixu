import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockQueryDto, AdjustStockDto, MovementQueryDto, MovementType } from './dto';
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
        const { warehouseId, productId, quantity, type, note } = dto;

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

            // Create stock movement record
            const movement = await tx.stockMovement.create({
                data: {
                    movementType: type,
                    variantId: variant.id,
                    fromWarehouseId: type === MovementType.EXPORT ? BigInt(warehouseId) : null,
                    toWarehouseId: type === MovementType.IMPORT ? BigInt(warehouseId) : null,
                    quantity: movementQuantity > 0 ? movementQuantity : -movementQuantity,
                    performedBy: performedBy || null,
                    note: note || null,
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
        const { warehouseId, productId, type, fromDate, toDate, page = 1, limit = 20 } = query;

        const where: Prisma.StockMovementWhereInput = {};

        if (warehouseId) {
            where.OR = [
                { fromWarehouseId: BigInt(warehouseId) },
                { toWarehouseId: BigInt(warehouseId) },
            ];
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
}
