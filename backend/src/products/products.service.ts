import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { BulkImportProductsDto } from './dto/bulk-import.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        sku: dto.sku || dto.barcode,
        categoryId: dto.categoryId ? BigInt(dto.categoryId) : null,
        defaultPrice: dto.price,
        defaultCost: dto.cost ?? 0,
        description: dto.description,
      },
      include: { category: true },
    });
  }

  async findAll(query: ProductQueryDto) {
    const { page, limit, search, categoryId } = query;

    const where: Prisma.ProductWhereInput = {};

    // Category filter
    if (categoryId) {
      where.categoryId = BigInt(categoryId);
    }

    // Search
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
        include: {
          category: true,
          variants: {
            include: {
              inventory: true,
            },
          },
          productPrices: {
            select: {
              priceListId: true,
              price: true,
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Calculate stock for each product
    const itemsWithStock = items.map((product) => {
      const totalStock = product.variants.reduce((sum, variant) => {
        const variantStock = variant.inventory.reduce(
          (invSum, inv) => invSum + Number(inv.quantity),
          0,
        );
        return sum + variantStock;
      }, 0);

      return {
        ...product,
        totalStock,
      };
    });

    return { data: itemsWithStock, meta: { page, limit, total } };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(id) },
      include: {
        category: true,
        variants: {
          include: {
            inventory: true,
          },
        },
      },
    });
    if (!product) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }

    // Calculate total stock
    const totalStock = product.variants.reduce((sum, variant) => {
      const variantStock = variant.inventory.reduce(
        (invSum, inv) => invSum + Number(inv.quantity),
        0,
      );
      return sum + variantStock;
    }, 0);

    return { ...product, totalStock };
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.ensureExists(id);

    const data: Prisma.ProductUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.sku !== undefined) data.sku = dto.sku;
    if (dto.price !== undefined) data.defaultPrice = dto.price;
    if (dto.cost !== undefined) data.defaultCost = dto.cost;
    if (dto.description !== undefined) data.description = dto.description;

    if (dto.categoryId !== undefined) {
      data.category = dto.categoryId
        ? { connect: { id: BigInt(dto.categoryId) } }
        : { disconnect: true };
    }

    return this.prisma.product.update({
      where: { id: BigInt(id) },
      data,
      include: { category: true },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.product.delete({ where: { id: BigInt(id) } });
  }

  /**
   * Bulk import products from Excel
   */
  async bulkImport(
    dto: BulkImportProductsDto,
  ): Promise<{
    success: boolean;
    processed: number;
    created: number;
    updated: number;
    failed: number;
    results: { sku: string; status: string; message?: string }[];
  }> {
    console.log('=== BULK IMPORT START ===');
    console.log('Total items:', dto.items?.length);
    if (dto.items?.[0]) {
      console.log('First item:', JSON.stringify(dto.items[0]));
    }

    const results: { sku: string; status: string; message?: string }[] = [];
    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const item of dto.items) {
      try {
        const identifier = item.sku || item.name;
        console.log('Processing item:', identifier);

        // Check if product already exists by SKU or name
        let existing: { id: bigint } | null = null;
        if (item.sku) {
          existing = await this.prisma.product.findFirst({
            where: { sku: item.sku },
            select: { id: true },
          });
        }
        if (!existing && item.name) {
          existing = await this.prisma.product.findFirst({
            where: { name: item.name },
            select: { id: true },
          });
        }

        // Find or create category if categoryPath is provided
        let categoryId: bigint | null = null;
        if (item.categoryPath) {
          categoryId = await this.findOrCreateCategoryPath(item.categoryPath);
        }

        // Use only basic fields that exist in original schema
        const productData = {
          name: item.name,
          sku: item.sku || null,
          description: item.description || null,
          defaultPrice: item.price ?? 0,
          defaultCost: item.cost ?? 0,
          categoryId: categoryId,
        };

        if (existing) {
          // Update existing product
          await this.prisma.product.update({
            where: { id: existing.id },
            data: productData,
          });
          updated++;
          results.push({ sku: identifier, status: 'updated' });
          console.log('Updated:', identifier);
        } else {
          // Create new product
          const product = await this.prisma.product.create({
            data: productData,
          });

          // Create default variant
          await this.prisma.productVariant.create({
            data: {
              productId: product.id,
              sku: item.sku || null,
              price: item.price ?? 0,
              cost: item.cost ?? 0,
              active: true,
            },
          });

          created++;
          results.push({ sku: identifier, status: 'created' });
          console.log('Created:', identifier);
        }
      } catch (error: any) {
        const identifier = item.sku || item.name;
        console.error('Error processing item:', identifier, error.message);
        failed++;
        results.push({
          sku: identifier,
          status: 'failed',
          message: error.message,
        });
      }
    }

    console.log('=== BULK IMPORT END ===');
    console.log('Created:', created, 'Updated:', updated, 'Failed:', failed);

    return {
      success: failed === 0,
      processed: dto.items.length,
      created,
      updated,
      failed,
      results: results.slice(0, 100), // Limit results to avoid huge response
    };
  }

  /**
   * Find or create category from path like "VPP > Bút > Bút bi"
   */
  private async findOrCreateCategoryPath(path: string): Promise<bigint | null> {
    const parts = path.split('>').map((p) => p.trim());
    if (parts.length === 0) return null;

    let parentId: bigint | null = null;
    let lastCategory: { id: bigint } | null = null;

    for (const name of parts) {
      if (!name) continue;

      // Try to find existing category
      const existing = await this.prisma.category.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          parentId: parentId,
        },
      });

      if (existing) {
        lastCategory = existing;
        parentId = existing.id;
      } else {
        // Create new category
        const createdCat = await this.prisma.category.create({
          data: {
            name,
            parentId,
          },
        });
        lastCategory = createdCat;
        parentId = createdCat.id;
      }
    }

    return lastCategory?.id ?? null;
  }

  /**
   * Export products to Excel format
   */
  async export() {
    const products = await this.prisma.product.findMany({
      include: {
        category: true,
        variants: {
          include: { inventory: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((p) => {
      const totalStock = p.variants.reduce((sum, v) => {
        return sum + v.inventory.reduce((s, i) => s + Number(i.quantity), 0);
      }, 0);

      return {
        categoryName: p.category?.name || '',
        sku: p.sku,
        name: p.name,
        price: Number(p.defaultPrice),
        cost: Number(p.defaultCost),
        stock: totalStock,
        description: p.description,
        createdAt: p.createdAt,
      };
    });
  }

  private async ensureExists(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(id) },
    });
    if (!product) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }
    return product;
  }
}
