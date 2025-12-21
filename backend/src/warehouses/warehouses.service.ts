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
                manager: dto.manager,
                active: dto.active ?? true,
                notes: dto.notes,
                storeId: dto.storeId ? BigInt(dto.storeId) : null,
            },
        });
    }

    async findAll() {
        const warehouses = await this.prisma.warehouse.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                inventory: {
                    include: {
                        variant: true,
                    },
                },
            },
        });

        // Calculate item count and total stock value for each warehouse
        return warehouses.map((wh) => {
            const itemCount = wh.inventory.length;

            // Calculate total stock value (quantity * variant cost)
            const totalValue = wh.inventory.reduce((sum, inv) => {
                const cost = Number(inv.variant?.cost || 0);
                const quantity = Number(inv.quantity || 0);
                return sum + (cost * quantity);
            }, 0);

            return {
                id: wh.id,
                storeId: wh.storeId,
                code: wh.code,
                name: wh.name,
                address: wh.address,
                manager: wh.manager,
                active: wh.active,
                notes: wh.notes,
                createdAt: wh.createdAt,
                updatedAt: wh.updatedAt,
                itemCount,
                totalValue,
            };
        });
    }

    async findOne(id: string) {
        const warehouse = await this.prisma.warehouse.findUnique({
            where: { id: BigInt(id) },
            include: {
                inventory: {
                    include: {
                        variant: {
                            include: {
                                product: true,
                            },
                        },
                    },
                },
            },
        });
        if (!warehouse) {
            throw new NotFoundException('WAREHOUSE_NOT_FOUND');
        }

        const itemCount = warehouse.inventory.length;
        const totalValue = warehouse.inventory.reduce((sum, inv) => {
            const cost = Number(inv.variant?.cost || 0);
            const quantity = Number(inv.quantity || 0);
            return sum + (cost * quantity);
        }, 0);

        return {
            ...warehouse,
            itemCount,
            totalValue,
        };
    }

    async update(id: string, dto: UpdateWarehouseDto) {
        await this.ensureExists(id);
        return this.prisma.warehouse.update({
            where: { id: BigInt(id) },
            data: {
                name: dto.name,
                code: dto.code,
                address: dto.address,
                manager: dto.manager,
                active: dto.active,
                notes: dto.notes,
                storeId: dto.storeId ? BigInt(dto.storeId) : undefined,
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
