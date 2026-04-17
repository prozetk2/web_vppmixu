import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

// Exported interface for transaction items in debt summary
export interface TransactionItem {
    productCode: string;
    productName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    salePrice: number;
    totalPrice: number;
}

@Injectable()
export class CustomersService {
    constructor(private readonly prisma: PrismaService) { }

    private resolveInvoiceAmountDue(invoice: { amountDue?: any; totalAmount?: any; amountPaid?: any }) {
        if (invoice.amountDue !== null && invoice.amountDue !== undefined) {
            return Math.max(0, Number(invoice.amountDue || 0));
        }

        const totalAmount = Math.max(0, Number(invoice.totalAmount || 0));
        const amountPaid = Math.max(0, Number(invoice.amountPaid || 0));
        return Math.max(0, totalAmount - amountPaid);
    }

    private generateCode(prefix: string): string {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const rand = String(Math.floor(Math.random() * 100)).padStart(2, '0');
        return `${prefix}${yy}${mm}${rand}`;
    }

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

        const code = dto.code || this.generateCode('KH');

        return this.prisma.customer.create({
            data: {
                code,
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

    // Get customer's invoices history
    async getInvoices(id: string) {
        const customer = await this.ensureExists(id);

        // First try by customerId FK
        let invoices = await this.prisma.invoice.findMany({
            where: { customerId: BigInt(id) },
            orderBy: { createdAt: 'desc' },
            include: {
                items: true,
            },
        });

        // If no invoices found and customer has code, try by customerCode
        if (invoices.length === 0 && customer.code) {
            invoices = await this.prisma.invoice.findMany({
                where: { customerCode: customer.code },
                orderBy: { createdAt: 'desc' },
                include: {
                    items: true,
                },
            });
        }

        return invoices.map((inv) => ({
            id: inv.id.toString(),
            invoiceNumber: inv.invoiceNumber,
            orderCode: inv.orderCode,
            totalAmount: Number(inv.totalAmount || 0),
            amountPaid: Number(inv.amountPaid || 0),
            amountDue: this.resolveInvoiceAmountDue(inv),
            discountAmount: Number(inv.discountAmount || 0),
            status: inv.status,
            seller: inv.seller || inv.creator || 'N/A',
            branch: inv.branch,
            paymentMethod: inv.paymentMethod,
            notes: inv.notes,
            createdAt: inv.createdAt,
            issuedAt: inv.issuedAt,
            items: inv.items.map((item) => ({
                productCode: item.productCode || '',
                productName: item.productName || '',
                unit: item.unit || 'Cái',
                quantity: Number(item.quantity || 0),
                unitPrice: Number(item.unitPrice || 0),
                discountAmount: Number(item.discountAmount || 0),
                salePrice: Number(item.salePrice || item.unitPrice || 0),
                totalPrice: Number(item.totalPrice || 0),
            })),
            itemCount: inv.items.length,
        }));
    }

    // Get customer's debt summary with transactions
    async getDebts(id: string, filter?: string) {
        const customer = await this.ensureExists(id);

        // Get invoices for this customer (main debt source) with items
        // First try by customerId FK
        let invoices = await this.prisma.invoice.findMany({
            where: { customerId: BigInt(id) },
            orderBy: { createdAt: 'asc' }, // Oldest first for running balance
            include: {
                items: true,
            },
        });

        // If no invoices found and customer has code, try by customerCode
        if (invoices.length === 0 && customer.code) {
            invoices = await this.prisma.invoice.findMany({
                where: { customerCode: customer.code },
                orderBy: { createdAt: 'asc' },
                include: {
                    items: true,
                },
            });
        }

        // Build transactions list with running balance
        const transactions: {
            id: string;
            code: string;
            time: Date;
            type: string;
            value: number;
            runningBalance: number;
            items?: TransactionItem[];
        }[] = [];

        let runningBalance = 0;

        // Check if customer has imported debt data
        const hasImportedData = customer.currentDebt !== null && customer.totalSales !== null;

        if (hasImportedData && invoices.length === 0) {
            // Use imported data when no actual invoices exist
            return {
                customerId: id,
                customerName: customer.name,
                customerCode: customer.code,
                totalSales: Number(customer.totalSales || 0),
                totalPaid: Number(customer.totalSales || 0) - Number(customer.currentDebt || 0),
                totalDebt: Number(customer.currentDebt || 0),
                transactionCount: 0,
                transactions: [],
            };
        }

        // Process invoices
        for (const inv of invoices) {
            const paidAmount = Number(inv.amountPaid || 0);
            const outstandingAmount = this.resolveInvoiceAmountDue(inv);
            const invoiceAmount = Number(inv.totalAmount || 0) > 0
                ? Number(inv.totalAmount || 0)
                : outstandingAmount + paidAmount;

            // Map invoice items for this transaction
            const invoiceItems: TransactionItem[] = inv.items.map((item) => ({
                productCode: item.productCode || '',
                productName: item.productName || '',
                unit: item.unit || 'Cái',
                quantity: Number(item.quantity || 0),
                unitPrice: Number(item.unitPrice || 0),
                discountAmount: Number(item.discountAmount || 0),
                salePrice: Number(item.salePrice || item.unitPrice || 0),
                totalPrice: Number(item.totalPrice || 0),
            }));

            // Sale transaction (increases debt)
            if (invoiceAmount > 0) {
                runningBalance += invoiceAmount;
                transactions.push({
                    id: inv.id.toString(),
                    code: inv.invoiceNumber || `HD${inv.id}`,
                    time: inv.createdAt,
                    type: 'Bán hàng',
                    value: invoiceAmount,
                    runningBalance: runningBalance,
                    items: invoiceItems, // Include items for sale transactions
                });
            }

            // Payment transaction (decreases debt)
            if (paidAmount > 0) {
                runningBalance -= paidAmount;
                transactions.push({
                    id: `${inv.id}-payment`,
                    code: inv.invoiceNumber || `HD${inv.id}`,
                    time: inv.createdAt,
                    type: 'Thanh toán',
                    value: -paidAmount,
                    runningBalance: runningBalance,
                    // No items for payment transactions
                });
            }
        }

        // Filter transactions if filter is provided
        let filteredTransactions = transactions;
        if (filter && filter !== 'all') {
            filteredTransactions = transactions.filter(t => t.type === filter);
        }

        // Sort by time descending (newest first for display)
        filteredTransactions.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        // Calculate totals
        const totalSales = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
        const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.amountPaid || 0), 0);
        const totalDebt = totalSales - totalPaid;

        return {
            customerId: id,
            customerName: customer.name,
            customerCode: customer.code,
            totalSales,
            totalPaid,
            totalDebt,
            transactionCount: filteredTransactions.length,
            transactions: filteredTransactions,
            // Legacy fields for backward compatibility
            totalOrders: totalSales,
            orderCount: invoices.length,
            orders: invoices.map((inv) => ({
                id: inv.id.toString(),
                orderNumber: inv.invoiceNumber,
                totalAmount: Number(inv.totalAmount || 0),
                paidAmount: Number(inv.amountPaid || 0),
                status: inv.status,
                createdAt: inv.createdAt,
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
