import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, PaymentMethod } from './dto/create-order.dto';
import { OrderQueryDto, OrderStatus } from './dto/order-query.dto';

@Injectable()
export class SalesService {
    constructor(private readonly prisma: PrismaService) { }

    // Generate order number: HD + YYYYMMDD + sequence
    private async generateOrderNumber(): Promise<string> {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = `HD${dateStr}`;

        const lastOrder = await this.prisma.order.findFirst({
            where: {
                orderNumber: { startsWith: prefix },
            },
            orderBy: { orderNumber: 'desc' },
        });

        let seq = 1;
        if (lastOrder?.orderNumber) {
            const lastSeq = parseInt(lastOrder.orderNumber.slice(-4), 10);
            seq = isNaN(lastSeq) ? 1 : lastSeq + 1;
        }

        return `${prefix}${String(seq).padStart(4, '0')}`;
    }

    async create(dto: CreateOrderDto, warehouseId?: string) {
        if (!dto.items || dto.items.length === 0) {
            throw new BadRequestException('ORDER_ITEMS_REQUIRED');
        }

        // Use transaction to ensure data consistency
        return this.prisma.$transaction(async (tx) => {
            // 1. Get product variants with prices
            const productIds = dto.items.map((item) => BigInt(item.productId));
            const products = await tx.product.findMany({
                where: { id: { in: productIds } },
                include: {
                    variants: {
                        where: { active: true },
                        take: 1,
                    },
                },
            });

            // Map product id to variant
            const productMap = new Map<string, any>();
            for (const p of products) {
                const variant = p.variants[0];
                if (variant) {
                    productMap.set(p.id.toString(), {
                        product: p,
                        variant,
                        price: variant.price || p.defaultPrice,
                    });
                }
            }

            // 2. Calculate totals
            let subtotal = 0;
            const orderItems: any[] = [];

            for (const item of dto.items) {
                const info = productMap.get(item.productId);
                if (!info) {
                    throw new BadRequestException(`PRODUCT_NOT_FOUND: ${item.productId}`);
                }

                const unitPrice = item.unitPrice ?? Number(info.price);
                const discount = item.discount ?? 0;
                const totalPrice = unitPrice * item.quantity - discount;

                subtotal += totalPrice;
                orderItems.push({
                    variantId: info.variant.id,
                    quantity: BigInt(item.quantity),
                    unitPrice,
                    totalPrice,
                    discount,
                });
            }

            const discountAmount = dto.discountAmount ?? 0;
            const taxAmount = 0; // Can implement VAT later
            const totalAmount = subtotal - discountAmount + taxAmount;

            // 3. Create order
            const orderNumber = await this.generateOrderNumber();
            const order = await tx.order.create({
                data: {
                    orderNumber,
                    customerId: dto.customerId ? BigInt(dto.customerId) : null,
                    status: 'COMPLETED',
                    subtotal,
                    discountAmount,
                    taxAmount,
                    totalAmount,
                    orderItems: {
                        create: orderItems,
                    },
                },
                include: {
                    orderItems: {
                        include: {
                            variant: {
                                include: { product: true },
                            },
                        },
                    },
                    customer: true,
                },
            });

            // 4. Create payment if provided
            if (dto.payment && dto.payment.amount > 0) {
                await tx.payment.create({
                    data: {
                        orderId: order.id,
                        amount: dto.payment.amount,
                        method: dto.payment.method || PaymentMethod.CASH,
                        status: 'COMPLETED',
                        paidAt: new Date(),
                        reference: dto.payment.reference,
                    },
                });
            }

            // 5. Deduct inventory (trừ tồn kho)
            const whId = warehouseId ? BigInt(warehouseId) : null;
            let targetWarehouseId = whId;

            // If no warehouse specified, try to find first one
            if (!targetWarehouseId) {
                const firstWh = await tx.warehouse.findFirst({ orderBy: { createdAt: 'asc' } });
                if (firstWh) targetWarehouseId = firstWh.id;
            }

            if (targetWarehouseId) {
                for (const item of orderItems) {
                    // Find or create inventory record
                    let inv = await tx.inventory.findFirst({
                        where: {
                            variantId: item.variantId,
                            warehouseId: targetWarehouseId,
                        },
                    });

                    if (!inv) {
                        inv = await tx.inventory.create({
                            data: {
                                variantId: item.variantId,
                                warehouseId: targetWarehouseId,
                                quantity: 0,
                            },
                        });
                    }

                    // Check sufficient stock
                    if (inv.quantity < item.quantity) {
                        throw new BadRequestException(`INSUFFICIENT_STOCK: variant ${item.variantId}`);
                    }

                    // Deduct
                    await tx.inventory.update({
                        where: { id: inv.id },
                        data: { quantity: { decrement: Number(item.quantity) } },
                    });

                    // Record movement
                    await tx.stockMovement.create({
                        data: {
                            movementType: 'SALE',
                            variantId: item.variantId,
                            fromWarehouseId: targetWarehouseId,
                            quantity: -Number(item.quantity),
                            note: `Bán hàng: ${orderNumber}`,
                        },
                    });
                }
            }

            return order;
        });
    }

    async findAll(query: OrderQueryDto) {
        const { search, customerId, status, fromDate, toDate, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (search) {
            where.orderNumber = { contains: search, mode: 'insensitive' };
        }

        if (customerId) {
            where.customerId = BigInt(customerId);
        }

        if (status) {
            where.status = status;
        }

        if (fromDate || toDate) {
            where.createdAt = {};
            if (fromDate) where.createdAt.gte = new Date(fromDate);
            if (toDate) where.createdAt.lte = new Date(toDate + 'T23:59:59');
        }

        const [data, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    customer: true,
                    orderItems: {
                        include: {
                            variant: {
                                include: { product: true },
                            },
                        },
                    },
                    payments: true,
                },
            }),
            this.prisma.order.count({ where }),
        ]);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: BigInt(id) },
            include: {
                customer: true,
                orderItems: {
                    include: {
                        variant: {
                            include: { product: true },
                        },
                    },
                },
                payments: true,
            },
        });

        if (!order) {
            throw new NotFoundException('ORDER_NOT_FOUND');
        }

        return order;
    }

    async returnOrder(id: string, note?: string) {
        const order = await this.findOne(id);

        if (order.status === 'RETURNED') {
            throw new BadRequestException('ORDER_ALREADY_RETURNED');
        }

        if (order.status === 'CANCELLED') {
            throw new BadRequestException('ORDER_IS_CANCELLED');
        }

        return this.prisma.$transaction(async (tx) => {
            // 1. Update order status
            await tx.order.update({
                where: { id: BigInt(id) },
                data: { status: 'RETURNED' },
            });

            // 2. Find first warehouse
            const warehouse = await tx.warehouse.findFirst({ orderBy: { createdAt: 'asc' } });
            if (!warehouse) return order;

            // 3. Restore inventory
            for (const item of order.orderItems) {
                let inv = await tx.inventory.findFirst({
                    where: {
                        variantId: item.variantId,
                        warehouseId: warehouse.id,
                    },
                });

                if (!inv) {
                    inv = await tx.inventory.create({
                        data: {
                            variantId: item.variantId,
                            warehouseId: warehouse.id,
                            quantity: 0,
                        },
                    });
                }

                await tx.inventory.update({
                    where: { id: inv.id },
                    data: { quantity: { increment: Number(item.quantity) } },
                });

                // Record movement
                await tx.stockMovement.create({
                    data: {
                        movementType: 'RETURN',
                        variantId: item.variantId,
                        toWarehouseId: warehouse.id,
                        quantity: Number(item.quantity),
                        note: note || `Trả hàng: ${order.orderNumber}`,
                    },
                });
            }

            return this.findOne(id);
        });
    }
}
