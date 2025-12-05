import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateCustomerDto) {
        return this.prisma.customer.create({
            data: {
                code: dto.code,
                name: dto.name,
                email: dto.email,
                phone: dto.phone,
                address: dto.address,
                taxNumber: dto.taxNumber,
            },
        });
    }

    findAll() {
        return this.prisma.customer.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const customer = await this.prisma.customer.findUnique({
            where: { id: BigInt(id) },
        });
        if (!customer) {
            throw new NotFoundException('CUSTOMER_NOT_FOUND');
        }
        return customer;
    }

    async update(id: string, dto: UpdateCustomerDto) {
        await this.ensureExists(id);
        return this.prisma.customer.update({
            where: { id: BigInt(id) },
            data: {
                code: dto.code,
                name: dto.name,
                email: dto.email,
                phone: dto.phone,
                address: dto.address,
                taxNumber: dto.taxNumber,
            },
        });
    }

    async remove(id: string) {
        await this.ensureExists(id);
        return this.prisma.customer.delete({
            where: { id: BigInt(id) },
        });
    }

    private async ensureExists(id: string) {
        const customer = await this.prisma.customer.findUnique({
            where: { id: BigInt(id) },
        });
        if (!customer) {
            throw new NotFoundException('CUSTOMER_NOT_FOUND');
        }
        return customer;
    }
}
