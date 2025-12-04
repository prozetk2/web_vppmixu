import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        barcode: dto.barcode,
        categoryId: dto.categoryId ?? null,
        unitId: dto.unitId,
        price: dto.price,
        cost: dto.cost ?? null,
        status: dto.status ?? ProductStatus.ACTIVE,
      },
    });
  }

  async findAll(query: ProductQueryDto) {
    const { page, limit, search, categoryId, includeDeleted } = query;

    const where: Prisma.ProductWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(categoryId ? { categoryId } : {}),
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data: items, meta: { page, limit, total } };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!product) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.ensureExists(id);
    return this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async ensureExists(id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!product) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }
    return product;
  }
}
