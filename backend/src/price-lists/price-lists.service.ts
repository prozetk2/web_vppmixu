import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { SetProductPriceDto } from './dto/set-product-price.dto';

@Injectable()
export class PriceListsService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.priceList.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        return this.prisma.priceList.findUnique({
            where: { id: BigInt(id) },
            include: {
                productPrices: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                sku: true,
                                name: true,
                                defaultPrice: true,
                            },
                        },
                    },
                },
            },
        });
    }

    async create(dto: CreatePriceListDto) {
        // If this is set as default, unset other defaults
        if (dto.isDefault) {
            await this.prisma.priceList.updateMany({
                where: { isDefault: true },
                data: { isDefault: false },
            });
        }

        return this.prisma.priceList.create({
            data: {
                name: dto.name,
                code: dto.code,
                description: dto.description,
                isDefault: dto.isDefault ?? false,
                active: dto.active ?? true,
            },
        });
    }

    async update(id: string, dto: UpdatePriceListDto) {
        // If this is set as default, unset other defaults
        if (dto.isDefault) {
            await this.prisma.priceList.updateMany({
                where: {
                    isDefault: true,
                    id: { not: BigInt(id) },
                },
                data: { isDefault: false },
            });
        }

        return this.prisma.priceList.update({
            where: { id: BigInt(id) },
            data: {
                name: dto.name,
                description: dto.description,
                isDefault: dto.isDefault,
                active: dto.active,
            },
        });
    }

    async delete(id: string) {
        return this.prisma.priceList.delete({
            where: { id: BigInt(id) },
        });
    }

    // Product price management
    async setProductPrice(dto: SetProductPriceDto) {
        return this.prisma.productPrice.upsert({
            where: {
                productId_priceListId: {
                    productId: BigInt(dto.productId),
                    priceListId: BigInt(dto.priceListId),
                },
            },
            create: {
                productId: BigInt(dto.productId),
                priceListId: BigInt(dto.priceListId),
                price: dto.price,
            },
            update: {
                price: dto.price,
            },
        });
    }

    async getProductPrices(priceListId: string) {
        return this.prisma.productPrice.findMany({
            where: { priceListId: BigInt(priceListId) },
            include: {
                product: {
                    select: {
                        id: true,
                        sku: true,
                        name: true,
                        defaultPrice: true,
                    },
                },
            },
        });
    }

    async bulkSetPrices(priceListId: string, prices: Array<{ productId: string; price: number }>) {
        const operations = prices.map(p =>
            this.prisma.productPrice.upsert({
                where: {
                    productId_priceListId: {
                        productId: BigInt(p.productId),
                        priceListId: BigInt(priceListId),
                    },
                },
                create: {
                    productId: BigInt(p.productId),
                    priceListId: BigInt(priceListId),
                    price: p.price,
                },
                update: {
                    price: p.price,
                },
            })
        );

        return this.prisma.$transaction(operations);
    }
}
