import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        sku: dto.barcode,
        categoryId: dto.categoryId ? BigInt(dto.categoryId) : null,
        defaultPrice: dto.price,
        defaultCost: dto.cost ?? 0,
      },
    });
  }

  async findAll(query: ProductQueryDto) {
    const { page, limit, search, categoryId, includeDeleted } = query;

    const where: Prisma.ProductWhereInput = {
      // ...(includeDeleted ? {} : { deletedAt: null }), // deletedAt gone
      ...(categoryId ? { categoryId: BigInt(categoryId) } : {}),
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { category: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data: items, meta: { page, limit, total } };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(id) },
      include: { category: true, variants: true },
    });
    if (!product) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.ensureExists(id);
    return this.prisma.product.update({
      where: { id: BigInt(id) },
      data: {
        name: dto.name,
        categoryId: dto.categoryId ? BigInt(dto.categoryId) : null,
        defaultPrice: dto.price,
        defaultCost: dto.cost,
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.product.delete({ where: { id: BigInt(id) } });
  }

  private async ensureExists(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id: BigInt(id) } });
    if (!product) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }
    return product;
  }
}
