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

            // 2. Fetch Customer if exists
            let customerData: any = null;
            if (dto.customerId) {
                customerData = await tx.customer.findUnique({
                    where: { id: BigInt(dto.customerId) }
                });
            }

            // 3. Calculate totals & Prepare Items
            let subtotal = 0;
            const orderItems: any[] = [];
            const invoiceItems: any[] = [];

            for (const item of dto.items) {
                const info = productMap.get(item.productId);
                if (!info) {
                    throw new BadRequestException(`PRODUCT_NOT_FOUND: ${item.productId}`);
                }

                const unitPrice = item.unitPrice ?? Number(info.price);
                const discount = item.discount ?? 0;
                const totalPrice = unitPrice * item.quantity - discount;

                subtotal += totalPrice;

                // For Order
                orderItems.push({
                    variantId: info.variant.id,
                    quantity: BigInt(item.quantity),
                    unitPrice,
                    totalPrice,
                    discount,
                });

                // For Invoice
                invoiceItems.push({
                    productCode: info.product.code,
                    productName: info.product.name,
                    unit: info.product.unit,
                    quantity: item.quantity,
                    unitPrice: unitPrice,
                    discountAmount: discount,
                    totalPrice: totalPrice,
                    brand: info.product.brand,
                    salePrice: unitPrice // Assuming sale price is the unit price used
                });
            }

            const discountAmount = dto.discountAmount ?? 0;
            const taxAmount = 0; // Can implement VAT later
            const totalAmount = subtotal - discountAmount + taxAmount;

            // 4. Create order
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

            // 5. Create Payment
            let amountPaid = 0;
            let paymentMethod = PaymentMethod.CASH;
            if (dto.payment && dto.payment.amount > 0) {
                amountPaid = dto.payment.amount;
                paymentMethod = dto.payment.method || PaymentMethod.CASH;

                await tx.payment.create({
                    data: {
                        orderId: order.id,
                        amount: amountPaid,
                        method: paymentMethod,
                        status: 'COMPLETED',
                        paidAt: new Date(),
                        reference: dto.payment.reference,
                    },
                });
            }

            // 6. Create Invoice (LINKED TO ORDER)
            // We use the same orderNumber as invoiceNumber for simplicity and traceability
            // Amount Due = Total - Paid
            const amountDue = totalAmount - amountPaid;

            await tx.invoice.create({
                data: {
                    invoiceNumber: orderNumber,
                    orderCode: orderNumber,
                    customerId: dto.customerId ? BigInt(dto.customerId) : null,
                    customerCode: customerData?.code,
                    customerName: customerData?.name || 'Khách lẻ',
                    customerPhone: customerData?.phone,
                    customerAddress: customerData?.address,
                    customerEmail: customerData?.email,
                    issuedAt: new Date(),
                    paymentMethod: paymentMethod.toString(),
                    status: 'COMPLETED',
                    totalAmount: totalAmount,
                    discountAmount: discountAmount,
                    amountPaid: amountPaid,
                    amountDue: amountDue > 0 ? amountDue : 0,
                    // Map payment specific columns based on method
                    cashAmount: paymentMethod === 'CASH' ? amountPaid : 0,
                    transferAmount: paymentMethod === 'TRANSFER' ? amountPaid : 0,
                    cardAmount: paymentMethod === 'CARD' ? amountPaid : 0,
                    notes: dto.note,
                    items: {
                        create: invoiceItems
                    }
                }
            });

            // 7. Deduct inventory (trừ tồn kho) - Allow negative inventory
            // Consolidate all warehouses into one main warehouse
            let targetWarehouseId: bigint | null = null;

            // Always use the first warehouse as the main consolidated warehouse
            const mainWarehouse = await tx.warehouse.findFirst({ orderBy: { createdAt: 'asc' } });
            if (mainWarehouse) {
                targetWarehouseId = mainWarehouse.id;
            }

            if (targetWarehouseId) {
                for (const item of orderItems) {
                    // Find or create inventory record in main warehouse
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

                    // NO STOCK CHECK - Allow negative inventory
                    // Remove the insufficient stock check to allow selling even when stock is 0 or negative

                    // Deduct (can result in negative quantity)
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
                            storeId: dto.storeId ? BigInt(dto.storeId) : null,
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
