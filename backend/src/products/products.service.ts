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

  private generateCode(prefix: string): string {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const rand = String(Math.floor(Math.random() * 100)).padStart(2, '0');
    return `${prefix}${yy}${mm}${rand}`;
  }

  async create(dto: CreateProductDto) {
    console.log('=== CREATE PRODUCT START ===');
    console.log('DTO:', JSON.stringify(dto));
    try {
      return await this.prisma.$transaction(async (tx) => {
        const sku = dto.sku || dto.barcode || this.generateCode('SP');
        console.log('Using SKU:', sku);

        const categoryId = dto.categoryId && /^\d+$/.test(dto.categoryId) 
          ? BigInt(dto.categoryId) 
          : null;

        const product = await tx.product.create({
          data: {
            name: dto.name,
            sku,
            categoryId,
            defaultPrice: dto.price,
            defaultCost: dto.cost ?? 0,
            description: dto.description,
            images: dto.images,
            unit: dto.unit || null,
          } as any,
          include: { category: true },
        });

        console.log('Product created:', product.id.toString());

        // Create default variant
        await tx.productVariant.create({
          data: {
            productId: product.id,
            sku: sku || null,
            price: dto.price ?? 0,
            cost: dto.cost ?? 0,
            active: true,
          },
        });

        console.log('Default variant created');

        return product;
      });
    } catch (error: any) {
      console.error('=== CREATE PRODUCT ERROR ===');
      console.error('Error message:', error.message);
      if (error.code) console.error('Error code:', error.code);
      if (error.meta) console.error('Error meta:', JSON.stringify(error.meta));
      console.error('Stack:', error.stack);
      throw error;
    }
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
        { barcode: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
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
    if (dto.images !== undefined) data.images = dto.images;
    if (dto.unit !== undefined) data.unit = dto.unit;

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
    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(id) },
      include: { variants: true },
    });
    if (!product) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }

    const variantIds = product.variants.map(v => v.id);

    return this.prisma.$transaction(async (tx) => {
      if (variantIds.length > 0) {
        // Delete inventory records
        await tx.inventory.deleteMany({
          where: { variantId: { in: variantIds } },
        });

        // Delete stock movements
        await tx.stockMovement.deleteMany({
          where: { variantId: { in: variantIds } },
        });

        // Delete purchase items
        await tx.purchaseItem.deleteMany({
          where: { variantId: { in: variantIds } },
        });

        // Delete order items
        await tx.orderItem.deleteMany({
          where: { variantId: { in: variantIds } },
        });

        // Delete variants
        await tx.productVariant.deleteMany({
          where: { productId: BigInt(id) },
        });
      }

      // Delete product prices (already has onDelete: Cascade, but explicit is safer)
      await tx.productPrice.deleteMany({
        where: { productId: BigInt(id) },
      });

      // Delete the product
      return tx.product.delete({ where: { id: BigInt(id) } });
    });
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

    // Get default warehouse for stock import if no warehouseId provided
    let warehouseId = dto.warehouseId ? BigInt(dto.warehouseId) : null;
    if (!warehouseId) {
      const defaultWarehouse = await this.prisma.warehouse.findFirst({
        where: { active: true },
        orderBy: { createdAt: 'asc' },
      });
      if (defaultWarehouse) {
        warehouseId = defaultWarehouse.id;
      }
    }

    for (const item of dto.items) {
      try {
        const identifier = item.sku || item.name;
        console.log('Processing item:', identifier);

        // Check if product already exists by SKU, barcode, or name
        let existing: { id: bigint } | null = null;
        if (item.sku) {
          existing = await this.prisma.product.findFirst({
            where: { sku: item.sku },
            select: { id: true },
          });
        }
        // Also try matching by barcode field
        if (!existing && item.barcode) {
          existing = await this.prisma.product.findFirst({
            where: { OR: [{ barcode: item.barcode }, { sku: item.barcode }] },
            select: { id: true },
          });
        }
        // Also try matching Excel SKU against DB barcode
        if (!existing && item.sku) {
          existing = await this.prisma.product.findFirst({
            where: { barcode: item.sku },
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
          sku: item.sku || this.generateCode('SP'),
          description: item.description || null,
          defaultPrice: item.price ?? 0,
          defaultCost: item.cost ?? 0,
          categoryId: categoryId,
          unit: item.unit || null,
        };

        if (existing) {
          // Update existing product
          await this.prisma.product.update({
            where: { id: existing.id },
            data: productData,
          });

          // Check if it has variants
          const variantCount = await this.prisma.productVariant.count({
            where: { productId: existing.id },
          });

          if (variantCount === 0) {
            const newVariant = await this.prisma.productVariant.create({
              data: {
                productId: existing.id,
                sku: item.sku || null,
                price: item.price ?? 0,
                cost: item.cost ?? 0,
                active: true,
              },
            });

            // Set initial stock for the new variant
            if (warehouseId && item.stock !== undefined) {
              await this.prisma.inventory.upsert({
                where: {
                  variantId_warehouseId: {
                    variantId: newVariant.id,
                    warehouseId: warehouseId,
                  }
                },
                update: { quantity: BigInt(item.stock) },
                create: {
                  variantId: newVariant.id,
                  warehouseId: warehouseId,
                  quantity: BigInt(item.stock),
                }
              });
            }
          } else {
            // If variant exists and we have stock value, update inventory for first variant
            if (warehouseId && item.stock !== undefined) {
              const firstVariant = await this.prisma.productVariant.findFirst({
                where: { productId: existing.id },
                orderBy: { id: 'asc' }
              });

              if (firstVariant) {
                await this.prisma.inventory.upsert({
                  where: {
                    variantId_warehouseId: {
                      variantId: firstVariant.id,
                      warehouseId: warehouseId,
                    }
                  },
                  update: { quantity: BigInt(item.stock) },
                  create: {
                    variantId: firstVariant.id,
                    warehouseId: warehouseId,
                    quantity: BigInt(item.stock),
                  }
                });
              }
            }
          }

          updated++;
          results.push({ sku: identifier, status: 'updated' });
          console.log('Updated:', identifier);
        } else {
          // Create new product
          const product = await this.prisma.product.create({
            data: productData,
          });

          // Create default variant
          const newVariant = await this.prisma.productVariant.create({
            data: {
              productId: product.id,
              sku: item.sku || null,
              price: item.price ?? 0,
              cost: item.cost ?? 0,
              active: true,
            },
          });

          // Set initial stock
          if (warehouseId && item.stock !== undefined) {
            await this.prisma.inventory.create({
              data: {
                variantId: newVariant.id,
                warehouseId: warehouseId,
                quantity: BigInt(item.stock),
              }
            });
          }

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
