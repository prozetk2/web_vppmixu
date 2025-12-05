import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehousesService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateWarehouseDto) {
        return this.prisma.warehouse.create({
            data: {
                name: dto.name,
                code: dto.code,
                address: dto.address,
                storeId: dto.storeId ? BigInt(dto.storeId) : null,
            },
        });
    }

    findAll() {
        return this.prisma.warehouse.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const warehouse = await this.prisma.warehouse.findUnique({
            where: { id: BigInt(id) },
        });
        if (!warehouse) {
            throw new NotFoundException('WAREHOUSE_NOT_FOUND');
        }
        return warehouse;
    }

    async update(id: string, dto: UpdateWarehouseDto) {
        await this.ensureExists(id);
        return this.prisma.warehouse.update({
            where: { id: BigInt(id) },
            data: {
                name: dto.name,
                code: dto.code,
                address: dto.address,
                storeId: dto.storeId ? BigInt(dto.storeId) : null,
            },
        });
    }

    async remove(id: string) {
        await this.ensureExists(id);
        return this.prisma.warehouse.delete({
            where: { id: BigInt(id) },
        });
    }

    private async ensureExists(id: string) {
        const warehouse = await this.prisma.warehouse.findUnique({
            where: { id: BigInt(id) },
        });
        if (!warehouse) {
            throw new NotFoundException('WAREHOUSE_NOT_FOUND');
        }
        return warehouse;
    }
}
