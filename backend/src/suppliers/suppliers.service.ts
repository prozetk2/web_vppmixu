import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

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
            },
        });
    }

    findAll() {
        return this.prisma.supplier.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const supplier = await this.prisma.supplier.findUnique({
            where: { id: BigInt(id) },
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
