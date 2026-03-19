import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

import { SupplierQueryDto } from './dto/supplier-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SuppliersService {
    constructor(private readonly prisma: PrismaService) { }

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

        return this.prisma.$transaction(async (tx) => {
            // 1. Update purchase orders if allocated
            if (dto.allocateToPurchases) {
                if (allocations && allocations.length > 0) {
                    for (const alloc of allocations) {
                        if (alloc.amount > 0) {
                            try {
                                // Fetch current PO to calculate new values correctly
                                const po = await tx.purchaseOrder.findUnique({
                                    where: { id: BigInt(alloc.purchaseOrderId) }
                                });

                                if (po) {
                                    const currentPaid = Number(po.amountPaid || 0);
                                    const total = Number(po.totalAmount || 0);
                                    const newPaid = currentPaid + Number(alloc.amount);
                                    const newDue = total - newPaid;

                                    await tx.purchaseOrder.update({
                                        where: { id: BigInt(alloc.purchaseOrderId) },
                                        data: {
                                            amountPaid: newPaid,
                                            amountDue: newDue,
                                            status: newDue <= 0 ? 'PAID' : 'PARTIAL'
                                        }
                                    });
                                }
                            } catch (e) {
                                console.error(`Error updating PO ${alloc.purchaseOrderId}`, e);
                            }
                        }
                    }
                } else {
                    // No explicit allocations from UI: auto-allocate FIFO to oldest unpaid purchases.
                    let remaining = Number(amount);
                    const unpaidOrders = await tx.purchaseOrder.findMany({
                        where: {
                            supplierId: BigInt(id),
                            status: { in: ['CONFIRMED', 'PARTIAL'] },
                        },
                        orderBy: { createdAt: 'asc' },
                    });

                    for (const po of unpaidOrders) {
                        if (remaining <= 0) break;

                        const total = Number(po.totalAmount || 0);
                        const currentPaid = Number(po.amountPaid || 0);
                        const due = Math.max(0, total - currentPaid);
                        if (due <= 0) continue;

                        const allocated = Math.min(due, remaining);
                        const newPaid = currentPaid + allocated;
                        const newDue = total - newPaid;

                        await tx.purchaseOrder.update({
                            where: { id: po.id },
                            data: {
                                amountPaid: newPaid,
                                amountDue: newDue,
                                status: newDue <= 0 ? 'PAID' : 'PARTIAL',
                            },
                        });

                        remaining -= allocated;
                    }
                }
            }

            // 2. Create SupplierPayment record
            const payment = await tx.supplierPayment.create({
                data: {
                    supplierId: BigInt(id),
                    amount: amount,
                    method: dto.paymentMethod || 'CASH',
                    note: dto.note,
                    code: `PC${Date.now()}`, // Simple code generation, can be improved
                }
            });

            // 3. Recalculate debt from ledger to avoid drift:
            // currentDebt = max(totalPurchase - sum(payments), 0)
            await this.recalculateCurrentDebt(BigInt(id), tx);

            return payment;
        });
    }

    async deletePayment(supplierId: string, paymentId: string) {
        const payment = await this.prisma.supplierPayment.findFirst({
            where: {
                id: BigInt(paymentId),
                supplierId: BigInt(supplierId),
            },
        });

        if (!payment) {
            throw new NotFoundException('PAYMENT_NOT_FOUND');
        }

        return this.prisma.$transaction(async (tx) => {
            // 1. Xóa payment record
            await tx.supplierPayment.delete({
                where: { id: BigInt(paymentId) },
            });

            // 2. Recalculate debt from remaining payments
            await this.recalculateCurrentDebt(BigInt(supplierId), tx);

            return { success: true, message: 'Đã xóa thanh toán thành công' };
        });
    }

    async getPayments(id: string) {
        return this.prisma.supplierPayment.findMany({
            where: { supplierId: BigInt(id) },
            orderBy: { createdAt: 'desc' }
        });
    }
}
