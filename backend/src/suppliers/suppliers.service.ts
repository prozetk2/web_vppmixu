import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

import { SupplierQueryDto } from './dto/supplier-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SuppliersService {
    constructor(private readonly prisma: PrismaService) { }

    private normalizePaymentMethod(method?: string) {
        const normalized = (method || 'CASH').trim().toUpperCase();
        return ['CASH', 'TRANSFER', 'CARD'].includes(normalized) ? normalized : 'CASH';
    }

    private async recalculateCurrentDebt(
        supplierId: bigint,
        tx: Prisma.TransactionClient = this.prisma,
    ): Promise<number> {
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

    async create(dto: CreateSupplierDto) {
        return this.prisma.supplier.create({
            data: {
                code: dto.code,
                name: dto.name,
                email: dto.email,
                phone: dto.phone,
                address: dto.address,
                taxNumber: dto.taxNumber,
                area: dto.area,
                ward: dto.ward,
                notes: dto.notes,
                supplierGroup: dto.supplierGroup,
                company: dto.company,
                creator: dto.creator,
                totalPurchase: dto.totalPurchase ?? 0,
                currentDebt: dto.currentDebt ?? 0,
                totalPurchaseAfterReturn: dto.totalPurchaseAfterReturn ?? 0,
                active: dto.active ?? true,
            },
        });
    }

    async findAll(query?: SupplierQueryDto) {
        // Default values
        const page = query?.page || 1;
        const limit = query?.limit || 20;
        const skip = (page - 1) * limit;
        const sortBy = query?.sortBy || 'createdAt';
        const sortOrder = query?.sortOrder || 'desc';

        // Build where clause
        const where: Prisma.SupplierWhereInput = {};

        // Search by code, name, phone
        if (query?.search) {
            const searchTerm = query.search.trim();
            where.OR = [
                { code: { contains: searchTerm, mode: 'insensitive' } },
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { phone: { contains: searchTerm, mode: 'insensitive' } },
            ];
        }

        // Date range filter (by createdAt)
        if (query?.dateFrom || query?.dateTo) {
            where.createdAt = {};
            if (query.dateFrom) {
                where.createdAt.gte = new Date(query.dateFrom);
            }
            if (query.dateTo) {
                const endDate = new Date(query.dateTo);
                endDate.setDate(endDate.getDate() + 1);
                where.createdAt.lte = endDate;
            }
        }

        // Total purchase filter
        if (query?.totalPurchaseFrom || query?.totalPurchaseTo) {
            where.totalPurchase = {};
            if (query.totalPurchaseFrom) {
                where.totalPurchase.gte = parseFloat(query.totalPurchaseFrom);
            }
            if (query.totalPurchaseTo) {
                where.totalPurchase.lte = parseFloat(query.totalPurchaseTo);
            }
        }

        // Current debt filter
        if (query?.currentDebtFrom || query?.currentDebtTo) {
            where.currentDebt = {};
            if (query.currentDebtFrom) {
                where.currentDebt.gte = parseFloat(query.currentDebtFrom);
            }
            if (query.currentDebtTo) {
                where.currentDebt.lte = parseFloat(query.currentDebtTo);
            }
        }

        // Get total count
        const total = await this.prisma.supplier.count({ where });

        // Get suppliers with pagination
        const suppliers = await this.prisma.supplier.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
        });

        const supplierIds = suppliers.map((s) => s.id);
        const paymentAgg = supplierIds.length
            ? await this.prisma.supplierPayment.groupBy({
                by: ['supplierId'],
                where: { supplierId: { in: supplierIds } },
                _sum: { amount: true },
            })
            : [];

        const paidMap = new Map<string, number>(
            paymentAgg.map((p) => [p.supplierId.toString(), Number(p._sum.amount || 0)]),
        );

        const suppliersWithDebt = suppliers.map((s) => {
            const totalPurchase = Number(s.totalPurchase || 0);
            const totalPaid = paidMap.get(s.id.toString()) || 0;
            const currentDebt = Math.max(0, totalPurchase - totalPaid);
            return {
                ...s,
                currentDebt,
            };
        });

        return {
            data: suppliersWithDebt,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const supplier = await this.prisma.supplier.findUnique({
            where: { id: BigInt(id) },
            include: {
                purchaseOrders: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });
        if (!supplier) {
            throw new NotFoundException('SUPPLIER_NOT_FOUND');
        }

        const paymentAgg = await this.prisma.supplierPayment.aggregate({
            where: { supplierId: BigInt(id) },
            _sum: { amount: true },
        });
        const totalPurchase = Number(supplier.totalPurchase || 0);
        const totalPaid = Number(paymentAgg._sum.amount || 0);

        return {
            ...supplier,
            currentDebt: Math.max(0, totalPurchase - totalPaid),
        };
    }

    async update(id: string, dto: UpdateSupplierDto) {
        await this.ensureExists(id);
        return this.prisma.supplier.update({
            where: { id: BigInt(id) },
            data: {
                code: dto.code,
                name: dto.name,
                email: dto.email,
                phone: dto.phone,
                address: dto.address,
                taxNumber: dto.taxNumber,
                area: dto.area,
                ward: dto.ward,
                notes: dto.notes,
                supplierGroup: dto.supplierGroup,
                company: dto.company,
                creator: dto.creator,
                totalPurchase: dto.totalPurchase,
                currentDebt: dto.currentDebt,
                totalPurchaseAfterReturn: dto.totalPurchaseAfterReturn,
                active: dto.active,
            },
        });
    }

    async remove(id: string) {
        await this.ensureExists(id);
        return this.prisma.supplier.delete({
            where: { id: BigInt(id) },
        });
    }

    private async ensureExists(id: string) {
        const supplier = await this.prisma.supplier.findUnique({
            where: { id: BigInt(id) },
        });
        if (!supplier) {
            throw new NotFoundException('SUPPLIER_NOT_FOUND');
        }
        return supplier;
    }

    async payDebt(id: string, dto: CreatePaymentDto) {
        await this.ensureExists(id);
        const { amount, allocations } = dto;
        const supplierId = BigInt(id);
        const paymentAmount = Number(amount || 0);

        if (!paymentAmount || paymentAmount <= 0) {
            throw new BadRequestException('INVALID_PAYMENT_AMOUNT');
        }

        const paymentCreatedAt = dto.createdAt ? new Date(dto.createdAt) : new Date();
        if (Number.isNaN(paymentCreatedAt.getTime())) {
            throw new BadRequestException('INVALID_PAYMENT_DATE');
        }

        return this.prisma.$transaction(async (tx) => {
            const resolvedAllocations: Array<{
                purchaseOrderId: bigint;
                amount: number;
            }> = [];

            if (dto.allocateToPurchases) {
                const purchaseOrders = await tx.purchaseOrder.findMany({
                    where: {
                        supplierId,
                        status: { not: 'CANCELLED' },
                    },
                    orderBy: { createdAt: 'asc' },
                });

                const purchaseOrderMap = new Map(
                    purchaseOrders.map((po) => [
                        po.id.toString(),
                        {
                            id: po.id,
                            totalAmount: Number(po.totalAmount || 0),
                            amountPaid: Number(po.amountPaid || 0),
                        },
                    ]),
                );

                const explicitAllocations = (allocations || []).filter((alloc) => Number(alloc.amount) > 0);

                if (explicitAllocations.length > 0) {
                    const seenPurchaseOrderIds = new Set<string>();
                    let allocatedTotal = 0;

                    for (const alloc of explicitAllocations) {
                        if (seenPurchaseOrderIds.has(alloc.purchaseOrderId)) {
                            throw new BadRequestException('DUPLICATE_PURCHASE_ORDER_ALLOCATION');
                        }

                        seenPurchaseOrderIds.add(alloc.purchaseOrderId);

                        const purchaseOrder = purchaseOrderMap.get(alloc.purchaseOrderId);
                        if (!purchaseOrder) {
                            throw new BadRequestException(`PURCHASE_ORDER_NOT_FOUND: ${alloc.purchaseOrderId}`);
                        }

                        const allocationAmount = Number(alloc.amount || 0);
                        const outstanding = Math.max(0, purchaseOrder.totalAmount - purchaseOrder.amountPaid);

                        if (allocationAmount > outstanding) {
                            throw new BadRequestException(`ALLOCATION_EXCEEDS_OUTSTANDING: ${alloc.purchaseOrderId}`);
                        }

                        allocatedTotal += allocationAmount;
                        resolvedAllocations.push({
                            purchaseOrderId: purchaseOrder.id,
                            amount: allocationAmount,
                        });
                    }

                    if (Math.abs(allocatedTotal - paymentAmount) > 0.001) {
                        throw new BadRequestException('ALLOCATIONS_MUST_MATCH_PAYMENT_AMOUNT');
                    }
                } else {
                    let remaining = paymentAmount;

                    for (const po of purchaseOrders) {
                        if (remaining <= 0) break;

                        const total = Number(po.totalAmount || 0);
                        const currentPaid = Number(po.amountPaid || 0);
                        const due = Math.max(0, total - currentPaid);
                        if (due <= 0) continue;

                        const allocated = Math.min(due, remaining);
                        resolvedAllocations.push({
                            purchaseOrderId: po.id,
                            amount: allocated,
                        });

                        remaining -= allocated;
                    }
                }
            }

            const payment = await tx.supplierPayment.create({
                data: {
                    supplierId,
                    amount: paymentAmount,
                    method: this.normalizePaymentMethod(dto.paymentMethod),
                    note: dto.note,
                    code: `PC${Date.now()}`, // Simple code generation, can be improved
                    createdAt: paymentCreatedAt,
                }
            });

            if (resolvedAllocations.length > 0) {
                for (const alloc of resolvedAllocations) {
                    const purchaseOrder = await tx.purchaseOrder.findUnique({
                        where: { id: alloc.purchaseOrderId },
                        select: {
                            id: true,
                            totalAmount: true,
                            amountPaid: true,
                        },
                    });

                    if (!purchaseOrder) {
                        continue;
                    }

                    const currentPaid = Number(purchaseOrder.amountPaid || 0);
                    const total = Number(purchaseOrder.totalAmount || 0);
                    const newPaid = currentPaid + alloc.amount;
                    const newDue = Math.max(0, total - newPaid);

                    await tx.purchaseOrder.update({
                        where: { id: purchaseOrder.id },
                        data: {
                            amountPaid: newPaid,
                            amountDue: newDue,
                            status: newDue <= 0 ? 'PAID' : 'PARTIAL',
                        },
                    });
                }

                await tx.supplierPaymentAllocation.createMany({
                    data: resolvedAllocations.map((alloc) => ({
                        paymentId: payment.id,
                        purchaseOrderId: alloc.purchaseOrderId,
                        amount: alloc.amount,
                        createdAt: paymentCreatedAt,
                    })),
                });
            }

            await this.recalculateCurrentDebt(supplierId, tx);

            return tx.supplierPayment.findUnique({
                where: { id: payment.id },
                include: {
                    allocations: {
                        include: {
                            purchaseOrder: {
                                select: {
                                    id: true,
                                    orderNumber: true,
                                },
                            },
                        },
                        orderBy: { createdAt: 'asc' },
                    },
                },
            });
        });
    }

    async deletePayment(supplierId: string, paymentId: string) {
        const payment = await this.prisma.supplierPayment.findFirst({
            where: {
                id: BigInt(paymentId),
                supplierId: BigInt(supplierId),
            },
            include: {
                allocations: true,
            },
        });

        if (!payment) {
            throw new NotFoundException('PAYMENT_NOT_FOUND');
        }

        return this.prisma.$transaction(async (tx) => {
            for (const allocation of payment.allocations) {
                const purchaseOrder = await tx.purchaseOrder.findUnique({
                    where: { id: allocation.purchaseOrderId },
                    select: {
                        id: true,
                        totalAmount: true,
                        amountPaid: true,
                    },
                });

                if (!purchaseOrder) {
                    continue;
                }

                const total = Number(purchaseOrder.totalAmount || 0);
                const currentPaid = Number(purchaseOrder.amountPaid || 0);
                const allocationAmount = Number(allocation.amount || 0);
                const newPaid = Math.max(0, currentPaid - allocationAmount);
                const newDue = Math.max(0, total - newPaid);

                await tx.purchaseOrder.update({
                    where: { id: purchaseOrder.id },
                    data: {
                        amountPaid: newPaid,
                        amountDue: newDue,
                        status: newDue <= 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'CONFIRMED',
                    },
                });
            }

            await tx.supplierPayment.delete({
                where: { id: BigInt(paymentId) },
            });

            await this.recalculateCurrentDebt(BigInt(supplierId), tx);

            return { success: true, message: 'Đã xóa thanh toán thành công' };
        });
    }

    async getPayments(id: string) {
        return this.prisma.supplierPayment.findMany({
            where: { supplierId: BigInt(id) },
            orderBy: { createdAt: 'desc' },
            include: {
                allocations: {
                    include: {
                        purchaseOrder: {
                            select: {
                                id: true,
                                orderNumber: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
    }
}
