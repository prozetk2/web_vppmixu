import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        code: dto.code,
        parentId: dto.parentId ?? null,
      },
    });
  }

  findAll() {
    return this.prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, deletedAt: null } });
    if (!category) {
      throw new NotFoundException('CATEGORY_NOT_FOUND');
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensureExists(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.category.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async ensureExists(id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, deletedAt: null } });
    if (!category) {
      throw new NotFoundException('CATEGORY_NOT_FOUND');
    }
    return category;
  }
}
