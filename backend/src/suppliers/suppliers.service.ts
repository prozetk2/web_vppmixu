import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
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
}

