import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchaseQueryDto } from './dto/purchase-query.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';

@Injectable()
export class PurchasesService {
    constructor(private readonly prisma: PrismaService) { }

    private normalizePaymentMethod(method?: string) {
        const normalized = (method || 'CASH').trim().toUpperCase();
        return ['CASH', 'TRANSFER', 'CARD'].includes(normalized) ? normalized : 'CASH';
    }

    private async recalculateSupplierCurrentDebt(
        supplierId: bigint,
        tx: Prisma.TransactionClient = this.prisma,
    ) {
        const supplier = await tx.supplier.findUnique({
            where: { id: supplierId },
            select: { totalPurchase: true },
        });

        const paymentAgg = await tx.supplierPayment.aggregate({
            where: { supplierId },
            _sum: { amount: true },
        });

        const totalPurchase = Number(supplier?.totalPurchase || 0);
        const totalPaid = Number(paymentAgg._sum.amount || 0);
        const currentDebt = Math.max(0, totalPurchase - totalPaid);

        await tx.supplier.update({
            where: { id: supplierId },
            data: { currentDebt },
        });

        return currentDebt;
    }

    // Generate purchase order number: PN + YYMM + 4-digit sequence (10 digits total)
    private async generateOrderNumber(): Promise<string> {
        const today = new Date();
        const yyStr = today.getFullYear().toString().slice(-2);
        const mmStr = String(today.getMonth() + 1).padStart(2, '0');
        const prefix = `PN${yyStr}${mmStr}`; // e.g. "PN2410"

        const lastOrder = await this.prisma.purchaseOrder.findFirst({
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

    private clampDiscountAmount(requestedDiscount: number | undefined, subtotalAmount: number) {
        return Math.min(Math.max(requestedDiscount || 0, 0), subtotalAmount);
    }

    private resolvePurchaseStatus(totalAmount: number, amountPaid: number) {
        if (amountPaid >= totalAmount && amountPaid > 0) {
            return 'PAID';
        }

        if (amountPaid > 0) {
            return 'PARTIAL';
        }

        return 'CONFIRMED';
    }

    async create(dto: CreatePurchaseDto) {
        if (!dto.items || dto.items.length === 0) {
            throw new BadRequestException('PURCHASE_ITEMS_REQUIRED');
        }

        // Verify supplier exists
        const supplier = await this.prisma.supplier.findUnique({
            where: { id: BigInt(dto.supplierId) },
        });
        if (!supplier) {
            throw new NotFoundException('SUPPLIER_NOT_FOUND');
        }

        // Get product variants
        const productIds = dto.items.map((item) => BigInt(item.productId));
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            include: {
                variants: {
                    where: { active: true },
                    take: 1,
                },
            },
        });

        const productMap = new Map<string, any>();
        for (const p of products) {
            const variant = p.variants[0];
            if (variant) {
                productMap.set(p.id.toString(), { product: p, variant });
            }
        }

        // Calculate totals
        let subtotalAmount = 0;
        const purchaseItems: any[] = [];

        for (const item of dto.items) {
            const info = productMap.get(item.productId);
            if (!info) {
                throw new BadRequestException(`PRODUCT_NOT_FOUND: ${item.productId}`);
            }

            const displayQuantity = item.displayQuantity ?? item.quantity;
            const totalCost = item.unitCost * displayQuantity;
            subtotalAmount += totalCost;

            purchaseItems.push({
                variantId: info.variant.id,
                quantity: item.quantity,
                unitCost: item.unitCost,
                unit: item.unit || info.product.baseUnitCode || info.product.unit || 'Cái',
                displayQuantity,
                totalCost,
            });
        }

        const discountAmount = this.clampDiscountAmount(dto.discountAmount, subtotalAmount);
        const totalAmount = Math.max(0, subtotalAmount - discountAmount);

        // Determine payment status
        const prepaymentAmount = dto.prepaymentAmount || 0;
        const initialStatus = this.resolvePurchaseStatus(totalAmount, prepaymentAmount);

        // Create purchase order with auto-confirm and inventory update
        const orderNumber = await this.generateOrderNumber();
        const supplierId = BigInt(dto.supplierId);
        const createdAt = dto.createdAt ? new Date(dto.createdAt) : new Date();

        return this.prisma.$transaction(async (tx) => {
            const order = await tx.purchaseOrder.create({
                data: {
                    orderNumber,
                    supplierId,
                    warehouseId: dto.warehouseId ? BigInt(dto.warehouseId) : null,
                    status: initialStatus,
                    totalAmount,
                    discountAmount,
                    amountPaid: prepaymentAmount,
                    amountDue: Math.max(0, totalAmount - prepaymentAmount),
                    note: dto.note,
                    createdAt,
                    confirmedAt: new Date(),
                    purchaseItems: {
                        create: purchaseItems.map(({ displayQuantity, ...item }) => item),
                    },
                },
                include: {
                    supplier: true,
                    warehouse: true,
                    purchaseItems: {
                        include: {
                            variant: {
                                include: { product: true },
                            },
                        },
                    },
                },
            });

            // If prepayment exists, create SupplierPayment record
            if (prepaymentAmount > 0) {
                const payment = await tx.supplierPayment.create({
                    data: {
                        supplierId,
                        amount: prepaymentAmount,
                        method: this.normalizePaymentMethod(dto.paymentMethod),
                        note: `Thanh toán trước cho ${orderNumber}`,
                        code: `PC${Date.now()}`,
                        createdAt,
                    }
                });

                await tx.supplierPaymentAllocation.create({
                    data: {
                        paymentId: payment.id,
                        purchaseOrderId: order.id,
                        amount: prepaymentAmount,
                        createdAt,
                    },
                });
            }

            // Auto-confirm: Add inventory (nhập kho tự động)
            let warehouseId = dto.warehouseId ? BigInt(dto.warehouseId) : null;
            if (!warehouseId) {
                const firstWh = await tx.warehouse.findFirst({ orderBy: { createdAt: 'asc' } });
                if (firstWh) warehouseId = firstWh.id;
            }

            if (!warehouseId) {
                throw new BadRequestException('NO_WAREHOUSE_AVAILABLE');
            }

            for (const item of purchaseItems) {
                let inv = await tx.inventory.findFirst({
                    where: {
                        variantId: item.variantId,
                        warehouseId: warehouseId,
                    },
                });

                if (!inv) {
                    inv = await tx.inventory.create({
                        data: {
                            variantId: item.variantId,
                            warehouseId: warehouseId,
                            quantity: 0,
                        },
                    });
                }

                // Add stock
                await tx.inventory.update({
                    where: { id: inv.id },
                    data: { quantity: { increment: Number(item.quantity) } },
                });

                // Record stock movement
                await tx.stockMovement.create({
                    data: {
                        movementType: 'PURCHASE',
                        reference: orderNumber,
                        referenceType: 'PURCHASE',
                        referenceId: order.id,
                        referenceCode: orderNumber,
                        variantId: item.variantId,
                        toWarehouseId: warehouseId,
                        quantity: Number(item.quantity),
                        displayQuantity: item.displayQuantity ?? Number(item.quantity),
                        displayUnit: item.unit || 'Cái',
                        unitCost: item.unitCost,
                        note: `Nhập hàng: ${orderNumber}`,
                    },
                });
            }

            await tx.supplier.update({
                where: { id: supplierId },
                data: {
                    totalPurchase: { increment: totalAmount },
                },
            });

            await this.recalculateSupplierCurrentDebt(supplierId, tx);

            return order;
        });
    }

    async findAll(query: PurchaseQueryDto) {
        const { search, supplierId, status, fromDate, toDate, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (search) {
            where.OR = [
                { orderNumber: { contains: search, mode: 'insensitive' } },
                { supplier: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }

        if (supplierId) {
            where.supplierId = BigInt(supplierId);
        }

        if (status) {
            where.status = { in: status.split(',') };
        }

        if (fromDate || toDate) {
            where.createdAt = {};
            if (fromDate) where.createdAt.gte = new Date(fromDate);
            if (toDate) where.createdAt.lte = new Date(toDate + 'T23:59:59');
        }

        const [data, total] = await Promise.all([
            this.prisma.purchaseOrder.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    supplier: true,
                    warehouse: true,
                    purchaseItems: {
                        include: {
                            variant: {
                                include: { product: true },
                            },
                        },
                    },
                },
            }),
            this.prisma.purchaseOrder.count({ where }),
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
        const order = await this.prisma.purchaseOrder.findUnique({
            where: { id: BigInt(id) },
            include: {
                supplier: true,
                warehouse: true,
                purchaseItems: {
                    include: {
                        variant: {
                            include: { product: true },
                        },
                    },
                },
            },
        });

        if (!order) {
            throw new NotFoundException('PURCHASE_ORDER_NOT_FOUND');
        }

        return order;
    }

    async update(id: string, dto: UpdatePurchaseDto) {
        const order = await this.findOne(id);

        if (order.status === 'CANCELLED') {
            throw new BadRequestException('CANNOT_UPDATE_CANCELLED_ORDER');
        }

        // All non-cancelled statuses (CONFIRMED, PAID, PARTIAL) have inventory in stock
        const hasInventory = ['CONFIRMED', 'PAID', 'PARTIAL'].includes(order.status);

        // Build update data
        const updateData: any = {};
        const newSupplierId = dto.supplierId ? BigInt(dto.supplierId) : null;
        if (newSupplierId) updateData.supplierId = newSupplierId;
        if (dto.warehouseId !== undefined) {
            updateData.warehouseId = dto.warehouseId ? BigInt(dto.warehouseId) : null;
        }
        if (dto.note !== undefined) updateData.note = dto.note;
        if (dto.createdAt) updateData.createdAt = new Date(dto.createdAt);

        const amountPaid = Number(order.amountPaid || 0);

        // If items are provided, recalculate
        if (dto.items && dto.items.length > 0) {
            const productIds = dto.items.map((item) => BigInt(item.productId));
            const products = await this.prisma.product.findMany({
                where: { id: { in: productIds } },
                include: {
                    variants: { where: { active: true }, take: 1 },
                },
            });

            const productMap = new Map<string, any>();
            for (const p of products) {
                const variant = p.variants[0];
                if (variant) {
                    productMap.set(p.id.toString(), { product: p, variant });
                }
            }

            let subtotalAmount = 0;
            const purchaseItems: any[] = [];

            for (const item of dto.items) {
                const info = productMap.get(item.productId);
                if (!info) {
                    throw new BadRequestException(`PRODUCT_NOT_FOUND: ${item.productId}`);
                }
                const displayQuantity = item.displayQuantity ?? item.quantity;
                const totalCost = item.unitCost * displayQuantity;
                subtotalAmount += totalCost;
                purchaseItems.push({
                    variantId: info.variant.id,
                    quantity: item.quantity,
                    unitCost: item.unitCost,
                    unit: item.unit || info.product.baseUnitCode || info.product.unit || 'Cái',
                    displayQuantity,
                    totalCost,
                });
            }

            const discountAmount = this.clampDiscountAmount(dto.discountAmount ?? Number(order.discountAmount || 0), subtotalAmount);
            const totalAmount = Math.max(0, subtotalAmount - discountAmount);
            updateData.totalAmount = totalAmount;
            updateData.discountAmount = discountAmount;

            // Recalculate payment status based on existing amountPaid vs new totalAmount
            updateData.status = this.resolvePurchaseStatus(totalAmount, amountPaid);
            updateData.amountDue = Math.max(0, totalAmount - amountPaid);

            return this.prisma.$transaction(async (tx) => {
                // If order has inventory, reverse old inventory first
                if (hasInventory) {
                    let warehouseId = order.warehouseId;
                    if (!warehouseId) {
                        const firstWh = await tx.warehouse.findFirst({ orderBy: { createdAt: 'asc' } });
                        if (firstWh) warehouseId = firstWh.id;
                    }

                    if (warehouseId) {
                        // Reverse old inventory: decrement stock for each old item
                        for (const oldItem of order.purchaseItems) {
                            const inv = await tx.inventory.findFirst({
                                where: {
                                    variantId: oldItem.variantId,
                                    warehouseId: warehouseId,
                                },
                            });
                            if (inv) {
                                await tx.inventory.update({
                                    where: { id: inv.id },
                                    data: { quantity: { decrement: Number(oldItem.quantity) } },
                                });
                            }
                        }

                        // Delete old stock movements for this order
                        const movementDeleteWhere: any = {
                            movementType: 'PURCHASE',
                            OR: [{ referenceId: order.id }],
                        };

                        if (order.orderNumber) {
                            movementDeleteWhere.OR.push(
                                { referenceCode: order.orderNumber },
                                { note: { contains: order.orderNumber } },
                            );
                        }

                        await tx.stockMovement.deleteMany({ where: movementDeleteWhere });
                    }

                    await tx.supplier.update({
                        where: { id: order.supplierId },
                        data: {
                            totalPurchase: { decrement: Number(order.totalAmount) },
                        },
                    });
                }

                // Delete old items and create new ones
                await tx.purchaseItem.deleteMany({
                    where: { purchaseOrderId: BigInt(id) },
                });

                await tx.purchaseOrder.update({
                    where: { id: BigInt(id) },
                    data: {
                        ...updateData,
                        purchaseItems: {
                            create: purchaseItems.map(({ displayQuantity, ...item }) => item),
                        },
                    },
                });

                // If order has inventory, re-apply inventory with new items
                if (hasInventory) {
                    let warehouseId = order.warehouseId;
                    if (!warehouseId) {
                        const firstWh = await tx.warehouse.findFirst({ orderBy: { createdAt: 'asc' } });
                        if (firstWh) warehouseId = firstWh.id;
                    }

                    if (warehouseId) {
                        for (const newItem of purchaseItems) {
                            let inv = await tx.inventory.findFirst({
                                where: {
                                    variantId: newItem.variantId,
                                    warehouseId: warehouseId,
                                },
                            });

                            if (!inv) {
                                inv = await tx.inventory.create({
                                    data: {
                                        variantId: newItem.variantId,
                                        warehouseId: warehouseId,
                                        quantity: 0,
                                    },
                                });
                            }

                            await tx.inventory.update({
                                where: { id: inv.id },
                                data: { quantity: { increment: Number(newItem.quantity) } },
                            });

                            await tx.stockMovement.create({
                                data: {
                                    movementType: 'PURCHASE',
                                    reference: order.orderNumber,
                                    referenceType: 'PURCHASE',
                                    referenceId: order.id,
                                    referenceCode: order.orderNumber,
                                    variantId: newItem.variantId,
                                    toWarehouseId: warehouseId,
                                    quantity: Number(newItem.quantity),
                                    displayQuantity: newItem.displayQuantity ?? Number(newItem.quantity),
                                    displayUnit: newItem.unit || 'Cái',
                                    unitCost: newItem.unitCost,
                                    note: `Nhập hàng: ${order.orderNumber}`,
                                },
                            });
                        }
                    }

                    const targetSupplierId = newSupplierId || order.supplierId;
                    await tx.supplier.update({
                        where: { id: targetSupplierId },
                        data: {
                            totalPurchase: { increment: totalAmount },
                        },
                    });
                }

                await this.recalculateSupplierCurrentDebt(order.supplierId, tx);
                if (newSupplierId && newSupplierId !== order.supplierId) {
                    await this.recalculateSupplierCurrentDebt(newSupplierId, tx);
                }

                return this.findOne(id);
            });
        }

        if (dto.discountAmount !== undefined) {
            const subtotalAmount = order.purchaseItems.reduce(
                (sum, item) => sum + Number(item.totalCost || 0),
                0,
            );
            const discountAmount = this.clampDiscountAmount(dto.discountAmount, subtotalAmount);
            const totalAmount = Math.max(0, subtotalAmount - discountAmount);

            updateData.discountAmount = discountAmount;
            updateData.totalAmount = totalAmount;
            updateData.status = this.resolvePurchaseStatus(totalAmount, amountPaid);
            updateData.amountDue = Math.max(0, totalAmount - amountPaid);
        }

        // Just update order info without items
        if ((dto.discountAmount !== undefined || (newSupplierId && newSupplierId !== order.supplierId)) && hasInventory) {
            await this.prisma.$transaction(async (tx) => {
                await tx.purchaseOrder.update({
                    where: { id: BigInt(id) },
                    data: updateData,
                });

                await tx.supplier.update({
                    where: { id: order.supplierId },
                    data: {
                        totalPurchase: { decrement: Number(order.totalAmount) },
                    },
                });

                const targetSupplierId = newSupplierId || order.supplierId;
                await tx.supplier.update({
                    where: { id: targetSupplierId },
                    data: {
                        totalPurchase: { increment: Number(updateData.totalAmount ?? order.totalAmount) },
                    },
                });

                await this.recalculateSupplierCurrentDebt(order.supplierId, tx);
                if (targetSupplierId !== order.supplierId) {
                    await this.recalculateSupplierCurrentDebt(targetSupplierId, tx);
                }
            });
        } else {
            await this.prisma.purchaseOrder.update({
                where: { id: BigInt(id) },
                data: updateData,
            });
        }

        return this.findOne(id);
    }

    async confirm(id: string) {
        const order = await this.findOne(id);

        if (order.status === 'CONFIRMED') {
            throw new BadRequestException('ORDER_ALREADY_CONFIRMED');
        }

        if (order.status === 'CANCELLED') {
            throw new BadRequestException('ORDER_IS_CANCELLED');
        }

        return this.prisma.$transaction(async (tx) => {
            // 1. Update order status
            await tx.purchaseOrder.update({
                where: { id: BigInt(id) },
                data: {
                    status: 'CONFIRMED',
                    confirmedAt: new Date(),
                },
            });

            // 2. Find warehouse
            let warehouseId = order.warehouseId;
            if (!warehouseId) {
                const firstWh = await tx.warehouse.findFirst({ orderBy: { createdAt: 'asc' } });
                if (firstWh) warehouseId = firstWh.id;
            }

            if (!warehouseId) {
                throw new BadRequestException('NO_WAREHOUSE_AVAILABLE');
            }

            // 3. Add inventory (nhập kho)
            for (const item of order.purchaseItems) {
                let inv = await tx.inventory.findFirst({
                    where: {
                        variantId: item.variantId,
                        warehouseId: warehouseId,
                    },
                });

                if (!inv) {
                    inv = await tx.inventory.create({
                        data: {
                            variantId: item.variantId,
                            warehouseId: warehouseId,
                            quantity: 0,
                        },
                    });
                }

                // Add stock
                await tx.inventory.update({
                    where: { id: inv.id },
                    data: { quantity: { increment: Number(item.quantity) } },
                });

                // Record movement with unitCost
                await tx.stockMovement.create({
                    data: {
                        movementType: 'PURCHASE',
                        reference: order.orderNumber,
                        referenceType: 'PURCHASE',
                        referenceId: order.id,
                        referenceCode: order.orderNumber,
                        variantId: item.variantId,
                        toWarehouseId: warehouseId,
                        quantity: Number(item.quantity),
                        displayQuantity: Number((item as any).displayQuantity || item.quantity),
                        displayUnit: item.unit || item.variant.product.baseUnitCode || item.variant.product.unit || 'Cái',
                        unitCost: item.unitCost,
                        note: `Nhập hàng: ${order.orderNumber}`,
                    },
                });
            }

            await tx.supplier.update({
                where: { id: order.supplierId },
                data: {
                    totalPurchase: { increment: Number(order.totalAmount) }
                }
            });

            await this.recalculateSupplierCurrentDebt(order.supplierId, tx);

            return this.findOne(id);
        });
    }

    async cancel(id: string) {
        const order = await this.findOne(id);

        if (order.status === 'CONFIRMED') {
            throw new BadRequestException('CANNOT_CANCEL_CONFIRMED_ORDER');
        }

        if (order.status === 'CANCELLED') {
            throw new BadRequestException('ORDER_ALREADY_CANCELLED');
        }

        return this.prisma.purchaseOrder.update({
            where: { id: BigInt(id) },
            data: { status: 'CANCELLED' },
            include: {
                supplier: true,
                purchaseItems: true,
            },
        });
    }

    async delete(id: string) {
        const order = await this.findOne(id);

        await this.prisma.$transaction(async (tx) => {
            // If confirmed, reverse the effects (inventory and supplier debt)
            if (order.status === 'CONFIRMED' || order.status === 'PAID' || order.status === 'PARTIAL') {
                let warehouseId = order.warehouseId;
                if (!warehouseId) {
                    const firstWh = await tx.warehouse.findFirst({ orderBy: { createdAt: 'asc' } });
                    if (firstWh) warehouseId = firstWh.id;
                }

                if (warehouseId) {
                    // Reverse inventory: decrement stock for each item
                    for (const item of order.purchaseItems) {
                        const inv = await tx.inventory.findFirst({
                            where: {
                                variantId: item.variantId,
                                warehouseId: warehouseId,
                            },
                        });
                        if (inv) {
                            await tx.inventory.update({
                                where: { id: inv.id },
                                data: { quantity: { decrement: Number(item.quantity) } },
                            });
                        }
                    }

                    // Delete related stock movements
                    await tx.stockMovement.deleteMany({
                        where: {
                            note: { contains: order.orderNumber || '' },
                            movementType: 'PURCHASE',
                        },
                    });
                }

                await tx.supplier.update({
                    where: { id: order.supplierId },
                    data: {
                        totalPurchase: { decrement: Number(order.totalAmount) },
                    },
                });
            }

            // Delete order items
            await tx.purchaseItem.deleteMany({
                where: { purchaseOrderId: BigInt(id) },
            });

            // Delete the purchase order itself
            await tx.purchaseOrder.delete({
                where: { id: BigInt(id) },
            });

            if (order.status === 'CONFIRMED' || order.status === 'PAID' || order.status === 'PARTIAL') {
                await this.recalculateSupplierCurrentDebt(order.supplierId, tx);
            }
        });

        return { success: true, message: 'Đã xóa đơn nhập hàng thành công và cập nhật lại tồn kho' };
    }

    async exportToExcel(query: PurchaseQueryDto) {
        const { search, supplierId, status, fromDate, toDate } = query;
        const where: any = {};

        if (search) {
            where.OR = [
                { orderNumber: { contains: search, mode: 'insensitive' } },
                { supplier: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }
        if (supplierId) {
            where.supplierId = BigInt(supplierId);
        }
        if (status) {
            where.status = status;
        }
        if (fromDate || toDate) {
            where.createdAt = {};
            if (fromDate) where.createdAt.gte = new Date(fromDate);
            if (toDate) where.createdAt.lte = new Date(toDate + 'T23:59:59');
        }

        const orders = await this.prisma.purchaseOrder.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                supplier: true,
                warehouse: true,
                purchaseItems: {
                    include: {
                        variant: {
                            include: { product: true },
                        },
                    },
                },
            },
        });

        // Transform to flat structure for Excel
        const rows: any[] = [];
        for (const order of orders) {
            for (const item of order.purchaseItems) {
                rows.push({
                    'Mã đơn': order.orderNumber,
                    'Nhà cung cấp': order.supplier?.name || '',
                    'Kho nhập': order.warehouse?.name || 'Tự động',
                    'Mã SP': item.variant?.product?.sku || '',
                    'Tên SP': item.variant?.product?.name || '',
                    'ĐVT': item.unit || item.variant?.product?.unit || item.variant?.product?.baseUnitCode || '',
                    'SL': Number(item.quantity),
                    'Đơn giá': Number(item.unitCost),
                    'Thành tiền': Number(item.totalCost),
                    'Trạng thái': order.status === 'CONFIRMED' ? 'Đã nhập kho' : order.status === 'CANCELLED' ? 'Đã hủy' : 'Chờ xác nhận',
                    'Ngày tạo': order.createdAt?.toISOString().slice(0, 10) || '',
                    'Ghi chú': order.note || '',
                });
            }
        }

        return rows;
    }
}
