import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateCustomerDto) {
        // Parse dates safely
        let birthDate: Date | undefined;
        let lastTransaction: Date | undefined;

        try {
            if (dto.birthDate) {
                birthDate = new Date(dto.birthDate);
                if (isNaN(birthDate.getTime())) birthDate = undefined;
            }
        } catch { }

        try {
            if (dto.lastTransaction) {
                lastTransaction = new Date(dto.lastTransaction);
                if (isNaN(lastTransaction.getTime())) lastTransaction = undefined;
            }
        } catch { }

        return this.prisma.customer.create({
            data: {
                code: dto.code,
                name: dto.name,
                email: dto.email,
                phone: dto.phone,
                address: dto.address,
                taxNumber: dto.taxNumber,
                contactPerson: dto.contactPerson,
                position: dto.position,
                fax: dto.fax,
                website: dto.website,
                street: dto.street,
                ward: dto.ward,
                district: dto.district,
                city: dto.city,
                country: dto.country,
                postalCode: dto.postalCode,
                bankName: dto.bankName,
                bankAccount: dto.bankAccount,
                bankBranch: dto.bankBranch,
                customerType: dto.customerType,
                industry: dto.industry,
                companySize: dto.companySize,
                customerGroup: dto.customerGroup,
                priority: dto.priority,
                source: dto.source,
                notes: dto.notes,
                creditLimit: dto.creditLimit,
                paymentTerms: dto.paymentTerms,
                // Thông tin từ Excel
                branch: dto.branch,
                deliveryArea: dto.deliveryArea,
                company: dto.company,
                idNumber: dto.idNumber,
                birthDate: birthDate,
                gender: dto.gender,
                facebook: dto.facebook,
                creator: dto.creator,
                lastTransaction: lastTransaction,
                // Thống kê tài chính
                debtDays: dto.debtDays,
                currentDebt: dto.currentDebt,
                totalSales: dto.totalSales,
                totalSalesAfterReturn: dto.totalSalesAfterReturn,
            },
        });
    }

    async findAll() {
        const customers = await this.prisma.customer.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                orders: {
                    include: {
                        payments: true,
                    },
                },
            },
        });

        // Calculate statistics for each customer
        return customers.map((customer) => {
            // Nếu đã có dữ liệu từ Excel/Import, ưu tiên sử dụng
            const hasImportedData = customer.currentDebt !== null && customer.totalSales !== null;

            let currentDebt = hasImportedData ? Number(customer.currentDebt) : 0;
            let debtDays = hasImportedData ? (customer.debtDays || 0) : 0;
            let totalSales = hasImportedData ? Number(customer.totalSales) : 0;
            let totalSalesAfterReturn = hasImportedData ? Number(customer.totalSalesAfterReturn) : 0;

            // Nếu chưa có dữ liệu import, tính toán từ orders
            if (!hasImportedData) {
                let totalPaid = 0;
                let oldestUnpaidDate: Date | null = null;

                for (const order of customer.orders) {
                    if (order.status === 'COMPLETED' || order.status === 'PENDING') {
                        totalSales += Number(order.totalAmount);

                        const orderPaid = order.payments
                            .filter((p) => p.status === 'COMPLETED')
                            .reduce((sum, p) => sum + Number(p.amount), 0);

                        totalPaid += orderPaid;

                        const orderDebt = Number(order.totalAmount) - orderPaid;
                        if (orderDebt > 0 && (!oldestUnpaidDate || order.createdAt < oldestUnpaidDate)) {
                            oldestUnpaidDate = order.createdAt;
                        }
                    }
                }

                currentDebt = totalSales - totalPaid;

                if (currentDebt > 0 && oldestUnpaidDate) {
                    const diffTime = Math.abs(new Date().getTime() - oldestUnpaidDate.getTime());
                    debtDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }

                totalSalesAfterReturn = totalSales;
            }

            // Remove orders from response and add statistics
            const { orders, ...customerData } = customer;

            return {
                ...customerData,
                currentDebt,
                debtDays,
                totalSales,
                totalSalesAfterReturn,
            };
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
                contactPerson: dto.contactPerson,
                position: dto.position,
                fax: dto.fax,
                website: dto.website,
                street: dto.street,
                ward: dto.ward,
                district: dto.district,
                city: dto.city,
                country: dto.country,
                postalCode: dto.postalCode,
                bankName: dto.bankName,
                bankAccount: dto.bankAccount,
                bankBranch: dto.bankBranch,
                customerType: dto.customerType,
                industry: dto.industry,
                companySize: dto.companySize,
                customerGroup: dto.customerGroup,
                priority: dto.priority,
                source: dto.source,
                notes: dto.notes,
                creditLimit: dto.creditLimit,
                paymentTerms: dto.paymentTerms,
                // Thông tin từ Excel
                branch: dto.branch,
                deliveryArea: dto.deliveryArea,
                company: dto.company,
                idNumber: dto.idNumber,
                birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
                gender: dto.gender,
                facebook: dto.facebook,
                creator: dto.creator,
                lastTransaction: dto.lastTransaction ? new Date(dto.lastTransaction) : undefined,
                // Thống kê tài chính
                debtDays: dto.debtDays,
                currentDebt: dto.currentDebt,
                totalSales: dto.totalSales,
                totalSalesAfterReturn: dto.totalSalesAfterReturn,
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
