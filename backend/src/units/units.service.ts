import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateUnitDto) {
    return this.prisma.unit.create({ data: dto });
  }

  findAll() {
    return this.prisma.unit.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const unit = await this.prisma.unit.findUnique({ where: { id } });
    if (!unit) {
      throw new NotFoundException('UNIT_NOT_FOUND');
    }
    return unit;
  }

  async update(id: string, dto: UpdateUnitDto) {
    await this.ensureExists(id);
    return this.prisma.unit.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.unit.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const unit = await this.prisma.unit.findUnique({ where: { id } });
    if (!unit) {
      throw new NotFoundException('UNIT_NOT_FOUND');
    }
    return unit;
  }
}
