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

    // Get customer's orders history
    async getOrders(id: string) {
        await this.ensureExists(id);
        return this.prisma.order.findMany({
            where: { customerId: BigInt(id) },
            orderBy: { createdAt: 'desc' },
            include: {
                orderItems: {
                    include: {
                        variant: {
                            include: { product: true },
                        },
                    },
                },
                payments: true,
            },
        });
    }

    // Get customer's debt summary
    async getDebts(id: string) {
        await this.ensureExists(id);

        // Get all orders for this customer
        const orders = await this.prisma.order.findMany({
            where: {
                customerId: BigInt(id),
                status: { in: ['COMPLETED', 'PENDING'] },
            },
            include: {
                payments: true,
            },
        });

        // Calculate debts: total order amount - total paid
        let totalOrders = 0;
        let totalPaid = 0;

        for (const order of orders) {
            totalOrders += Number(order.totalAmount);
            for (const payment of order.payments) {
                if (payment.status === 'COMPLETED') {
                    totalPaid += Number(payment.amount);
                }
            }
        }

        const totalDebt = totalOrders - totalPaid;

        return {
            customerId: id,
            totalOrders,
            totalPaid,
            totalDebt,
            orderCount: orders.length,
            orders: orders.map((o) => ({
                id: o.id.toString(),
                orderNumber: o.orderNumber,
                totalAmount: Number(o.totalAmount),
                paidAmount: o.payments
                    .filter((p) => p.status === 'COMPLETED')
                    .reduce((sum, p) => sum + Number(p.amount), 0),
                status: o.status,
                createdAt: o.createdAt,
            })),
        };
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
