import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        code: dto.code,
        parentId: dto.parentId ? BigInt(dto.parentId) : null,
      },
    });
  }

  findAll() {
    return this.prisma.category.findMany({
      // where: { deletedAt: null }, // deletedAt removed from schema
      // orderBy: { createdAt: 'desc' }, // createdAt removed from schema
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id: BigInt(id) } });
    if (!category) {
      throw new NotFoundException('CATEGORY_NOT_FOUND');
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensureExists(id);
    return this.prisma.category.update({
      where: { id: BigInt(id) },
      data: {
        name: dto.name,
        code: dto.code,
        parentId: dto.parentId ? BigInt(dto.parentId) : null,
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    // Hard delete since deletedAt is gone, or implement soft delete if schema supports it (it doesn't currently)
    return this.prisma.category.delete({ where: { id: BigInt(id) } });
  }

  private async ensureExists(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id: BigInt(id) } });
    if (!category) {
      throw new NotFoundException('CATEGORY_NOT_FOUND');
    }
    return category;
  }
}
