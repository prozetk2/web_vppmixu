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
                totalPurchase: dto.totalPurchase,
                currentDebt: dto.currentDebt,
                totalPurchaseAfterReturn: dto.totalPurchaseAfterReturn,
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

        return {
            data: suppliers,
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
        return supplier;
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
            if (dto.allocateToPurchases && allocations && allocations.length > 0) {
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
            }

            // 2. Update supplier debt
            const supplier = await tx.supplier.findUnique({ where: { id: BigInt(id) } });
            const currentDebt = Number(supplier?.currentDebt || 0);
            const newDebt = currentDebt - Number(amount);

            // 3. Create SupplierPayment record
            const payment = await tx.supplierPayment.create({
                data: {
                    supplierId: BigInt(id),
                    amount: amount,
                    method: dto.paymentMethod || 'CASH',
                    note: dto.note,
                    code: `PC${Date.now()}`, // Simple code generation, can be improved
                }
            });

            await tx.supplier.update({
                where: { id: BigInt(id) },
                data: {
                    currentDebt: newDebt
                }
            });

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
            // 1. Cộng lại nợ NCC (xóa thanh toán = nợ tăng lại)
            await tx.supplier.update({
                where: { id: BigInt(supplierId) },
                data: {
                    currentDebt: { increment: Number(payment.amount) },
                },
            });

            // 2. Xóa payment record
            await tx.supplierPayment.delete({
                where: { id: BigInt(paymentId) },
            });

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

