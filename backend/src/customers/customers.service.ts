import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateCustomerPaymentDto } from './dto/create-payment.dto';
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

export interface CustomerPaymentAllocationRecord {
    id: bigint;
    paymentId: bigint;
    invoiceId: bigint;
    amount: number;
    createdAt: Date;
    invoice: {
        id: string;
        invoiceNumber: string | null;
        createdAt: Date | null;
    } | null;
}

export interface CustomerPaymentRecord {
    id: bigint;
    code: string | null;
    customerId: bigint;
    amount: number;
    method: string | null;
    collector: string | null;
    note: string | null;
    createdAt: Date;
    allocations: CustomerPaymentAllocationRecord[];
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

    private normalizePaymentMethod(method?: string) {
        const normalized = (method || 'CASH').trim().toUpperCase();
        return ['CASH', 'TRANSFER', 'CARD'].includes(normalized) ? normalized : 'CASH';
    }

    private getCustomerInvoiceWhere(customer: { id: bigint; code?: string | null }): Prisma.InvoiceWhereInput {
        const orConditions: Prisma.InvoiceWhereInput[] = [
            { customerId: customer.id },
        ];

        if (customer.code) {
            orConditions.push({ customerCode: customer.code });
        }

        return {
            OR: orConditions,
            status: { not: 'CANCELLED' },
        };
    }

    private async recalculateCurrentDebt(
        customer: { id: bigint; code?: string | null; currentDebt?: Prisma.Decimal | number | null },
        tx: Prisma.TransactionClient = this.prisma,
        fallbackCurrentDebt?: number,
    ): Promise<number> {
        const invoices = await tx.invoice.findMany({
            where: this.getCustomerInvoiceWhere(customer),
            select: {
                amountDue: true,
                amountPaid: true,
                totalAmount: true,
            },
        });

        const currentDebt = invoices.length > 0
            ? invoices.reduce((sum, invoice) => sum + this.resolveInvoiceAmountDue(invoice), 0)
            : Math.max(0, Number(fallbackCurrentDebt ?? customer.currentDebt ?? 0));

        await tx.customer.update({
            where: { id: customer.id },
            data: { currentDebt },
        });

        return currentDebt;
    }

    private mergeInvoicePaymentMethod(existingMethod: string | null | undefined, newMethod: string, currentPaid: number) {
        const normalizedExisting = (existingMethod || '').trim().toUpperCase();
        if (currentPaid <= 0 || !normalizedExisting) {
            return newMethod;
        }

        return normalizedExisting === newMethod ? normalizedExisting : 'MULTIPLE';
    }

    private resolveInvoicePaymentMethodFromAmounts(cashAmount: number, cardAmount: number, transferAmount: number) {
        const hasCash = cashAmount > 0.001;
        const hasCard = cardAmount > 0.001;
        const hasTransfer = transferAmount > 0.001;
        const activeCount = Number(hasCash) + Number(hasCard) + Number(hasTransfer);

        if (activeCount <= 0) {
            return null;
        }

        if (activeCount > 1) {
            return 'MULTIPLE';
        }

        if (hasCash) return 'CASH';
        if (hasCard) return 'CARD';
        return 'TRANSFER';
    }

    private generatePaymentCode() {
        return `PT${Date.now()}${Math.floor(Math.random() * 1000)}`;
    }

    private async createCustomerPayment(
        tx: Prisma.TransactionClient,
        data: {
            customerId: bigint;
            amount: number;
            method: string;
            collector?: string | null;
            note?: string | null;
            code: string;
            createdAt: Date;
        },
    ): Promise<bigint> {
        const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
            INSERT INTO "customer_payment" (
                "code",
                "customer_id",
                "amount",
                "method",
                "collector",
                "note",
                "created_at"
            )
            VALUES (
                ${data.code},
                ${data.customerId},
                ${data.amount},
                ${data.method},
                ${data.collector ?? null},
                ${data.note ?? null},
                ${data.createdAt}
            )
            RETURNING "id"
        `);

        return rows[0].id;
    }

    private async createCustomerPaymentAllocations(
        tx: Prisma.TransactionClient,
        paymentId: bigint,
        allocations: Array<{ invoiceId: bigint; amount: number }>,
        createdAt: Date,
    ) {
        for (const allocation of allocations) {
            await tx.$executeRaw(Prisma.sql`
                INSERT INTO "customer_payment_allocation" (
                    "payment_id",
                    "invoice_id",
                    "amount",
                    "created_at"
                )
                VALUES (
                    ${paymentId},
                    ${allocation.invoiceId},
                    ${allocation.amount},
                    ${createdAt}
                )
            `);
        }
    }

    private async getCustomerPaymentsWithAllocations(
        customerId: bigint,
        tx: Prisma.TransactionClient | PrismaService = this.prisma,
        order: 'asc' | 'desc' = 'desc',
    ): Promise<CustomerPaymentRecord[]> {
        const direction = order === 'asc' ? Prisma.raw('ASC') : Prisma.raw('DESC');
        const payments = await tx.$queryRaw<Array<{
            id: bigint;
            code: string | null;
            customerId: bigint;
            amount: Prisma.Decimal | number | string;
            method: string | null;
            collector: string | null;
            note: string | null;
            createdAt: Date;
        }>>(Prisma.sql`
            SELECT
                "id",
                "code",
                "customer_id" AS "customerId",
                "amount",
                "method",
                "collector",
                "note",
                "created_at" AS "createdAt"
            FROM "customer_payment"
            WHERE "customer_id" = ${customerId}
            ORDER BY "created_at" ${direction}, "id" ${direction}
        `);

        if (payments.length === 0) {
            return [];
        }

        const paymentIds = payments.map((payment) => payment.id);
        const allocations = await tx.$queryRaw<Array<{
            id: bigint;
            paymentId: bigint;
            invoiceId: bigint;
            amount: Prisma.Decimal | number | string;
            createdAt: Date;
            invoiceNumber: string | null;
            invoiceCreatedAt: Date | null;
        }>>(Prisma.sql`
            SELECT
                alloc."id",
                alloc."payment_id" AS "paymentId",
                alloc."invoice_id" AS "invoiceId",
                alloc."amount",
                alloc."created_at" AS "createdAt",
                inv."invoice_number" AS "invoiceNumber",
                inv."created_at" AS "invoiceCreatedAt"
            FROM "customer_payment_allocation" alloc
            LEFT JOIN "invoice" inv ON inv."id" = alloc."invoice_id"
            WHERE alloc."payment_id" IN (${Prisma.join(paymentIds)})
            ORDER BY alloc."created_at" ASC, alloc."id" ASC
        `);

        const allocationsByPaymentId = new Map<string, CustomerPaymentAllocationRecord[]>();
        allocations.forEach((allocation) => {
            const paymentKey = allocation.paymentId.toString();
            const bucket = allocationsByPaymentId.get(paymentKey) || [];
            bucket.push({
                id: allocation.id,
                paymentId: allocation.paymentId,
                invoiceId: allocation.invoiceId,
                amount: Number(allocation.amount || 0),
                createdAt: allocation.createdAt,
                invoice: {
                    id: allocation.invoiceId.toString(),
                    invoiceNumber: allocation.invoiceNumber,
                    createdAt: allocation.invoiceCreatedAt,
                },
            });
            allocationsByPaymentId.set(paymentKey, bucket);
        });

        return payments.map((payment) => ({
            id: payment.id,
            code: payment.code,
            customerId: payment.customerId,
            amount: Number(payment.amount || 0),
            method: payment.method,
            collector: payment.collector,
            note: payment.note,
            createdAt: payment.createdAt,
            allocations: allocationsByPaymentId.get(payment.id.toString()) || [],
        }));
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

        const invoices = await this.prisma.invoice.findMany({
            where: this.getCustomerInvoiceWhere(customer),
            select: {
                amountDue: true,
                amountPaid: true,
                totalAmount: true,
            },
        });

        if (invoices.length === 0) {
            return customer;
        }

        return {
            ...customer,
            currentDebt: invoices.reduce((sum, invoice) => sum + this.resolveInvoiceAmountDue(invoice), 0),
        };
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

    async payDebt(id: string, dto: CreateCustomerPaymentDto) {
        const customer = await this.ensureExists(id);
        const customerId = BigInt(id);
        const paymentAmount = Number(dto.amount || 0);

        if (!paymentAmount || paymentAmount <= 0) {
            throw new BadRequestException('INVALID_PAYMENT_AMOUNT');
        }

        const paymentCreatedAt = dto.createdAt ? new Date(dto.createdAt) : new Date();
        if (Number.isNaN(paymentCreatedAt.getTime())) {
            throw new BadRequestException('INVALID_PAYMENT_DATE');
        }

        return this.prisma.$transaction(async (tx) => {
            const outstandingInvoices = await tx.invoice.findMany({
                where: this.getCustomerInvoiceWhere(customer),
                orderBy: { createdAt: 'asc' },
                select: {
                    id: true,
                    invoiceNumber: true,
                    totalAmount: true,
                    amountPaid: true,
                    amountDue: true,
                    paymentMethod: true,
                    cashAmount: true,
                    cardAmount: true,
                    transferAmount: true,
                },
            });

            const invoiceMap = new Map(
                outstandingInvoices.map((invoice) => [
                    invoice.id.toString(),
                    {
                        ...invoice,
                        outstanding: this.resolveInvoiceAmountDue(invoice),
                    },
                ]),
            );

            const totalOutstanding = Array.from(invoiceMap.values())
                .reduce((sum, invoice) => sum + invoice.outstanding, 0);

            if (totalOutstanding <= 0) {
                const fallbackDebt = Math.max(0, Number(customer.currentDebt || 0));
                if (paymentAmount > fallbackDebt) {
                    throw new BadRequestException('PAYMENT_EXCEEDS_OUTSTANDING_DEBT');
                }

                const paymentId = await this.createCustomerPayment(tx, {
                    customerId,
                    amount: paymentAmount,
                    method: this.normalizePaymentMethod(dto.paymentMethod),
                    collector: dto.collector?.trim() || null,
                    note: dto.note,
                    code: this.generatePaymentCode(),
                    createdAt: paymentCreatedAt,
                });

                await this.recalculateCurrentDebt(
                    customer,
                    tx,
                    Math.max(0, fallbackDebt - paymentAmount),
                );

                const payments = await this.getCustomerPaymentsWithAllocations(customerId, tx, 'desc');
                return payments.find((payment) => payment.id === paymentId) || null;
            }

            if (paymentAmount - totalOutstanding > 0.001) {
                throw new BadRequestException('PAYMENT_EXCEEDS_OUTSTANDING_DEBT');
            }

            const resolvedAllocations: Array<{ invoiceId: bigint; amount: number }> = [];
            const explicitAllocations = (dto.allocations || []).filter((allocation) => Number(allocation.amount) > 0);

            if (explicitAllocations.length > 0) {
                let allocatedTotal = 0;
                const seenInvoiceIds = new Set<string>();

                for (const allocation of explicitAllocations) {
                    if (seenInvoiceIds.has(allocation.invoiceId)) {
                        throw new BadRequestException('DUPLICATE_INVOICE_ALLOCATION');
                    }

                    seenInvoiceIds.add(allocation.invoiceId);

                    const invoice = invoiceMap.get(allocation.invoiceId);
                    if (!invoice) {
                        throw new BadRequestException(`INVOICE_NOT_FOUND: ${allocation.invoiceId}`);
                    }

                    const allocationAmount = Number(allocation.amount || 0);
                    if (allocationAmount > invoice.outstanding) {
                        throw new BadRequestException(`ALLOCATION_EXCEEDS_OUTSTANDING: ${allocation.invoiceId}`);
                    }

                    allocatedTotal += allocationAmount;
                    resolvedAllocations.push({
                        invoiceId: invoice.id,
                        amount: allocationAmount,
                    });
                }

                if (Math.abs(allocatedTotal - paymentAmount) > 0.001) {
                    throw new BadRequestException('ALLOCATIONS_MUST_MATCH_PAYMENT_AMOUNT');
                }
            } else {
                let remaining = paymentAmount;

                for (const invoice of outstandingInvoices) {
                    if (remaining <= 0) break;

                    const outstanding = this.resolveInvoiceAmountDue(invoice);
                    if (outstanding <= 0) continue;

                    const allocatedAmount = Math.min(outstanding, remaining);
                    resolvedAllocations.push({
                        invoiceId: invoice.id,
                        amount: allocatedAmount,
                    });

                    remaining -= allocatedAmount;
                }
            }

            const paymentMethod = this.normalizePaymentMethod(dto.paymentMethod);
            const paymentId = await this.createCustomerPayment(tx, {
                customerId,
                amount: paymentAmount,
                method: paymentMethod,
                collector: dto.collector?.trim() || null,
                note: dto.note,
                code: this.generatePaymentCode(),
                createdAt: paymentCreatedAt,
            });

            for (const allocation of resolvedAllocations) {
                const invoice = invoiceMap.get(allocation.invoiceId.toString());
                if (!invoice) continue;

                const currentPaid = Number(invoice.amountPaid || 0);
                const totalAmount = Number(invoice.totalAmount || 0);
                const newPaid = Math.min(totalAmount, currentPaid + allocation.amount);
                const newDue = Math.max(0, totalAmount - newPaid);

                await tx.invoice.update({
                    where: { id: allocation.invoiceId },
                    data: {
                        amountPaid: newPaid,
                        amountDue: newDue,
                        paymentMethod: this.mergeInvoicePaymentMethod(invoice.paymentMethod, paymentMethod, currentPaid),
                        cashAmount: paymentMethod === 'CASH'
                            ? Number(invoice.cashAmount || 0) + allocation.amount
                            : Number(invoice.cashAmount || 0),
                        cardAmount: paymentMethod === 'CARD'
                            ? Number(invoice.cardAmount || 0) + allocation.amount
                            : Number(invoice.cardAmount || 0),
                        transferAmount: paymentMethod === 'TRANSFER'
                            ? Number(invoice.transferAmount || 0) + allocation.amount
                            : Number(invoice.transferAmount || 0),
                    },
                });
            }

            if (resolvedAllocations.length > 0) {
                await this.createCustomerPaymentAllocations(tx, paymentId, resolvedAllocations, paymentCreatedAt);
            }

            await this.recalculateCurrentDebt(customer, tx);

            const payments = await this.getCustomerPaymentsWithAllocations(customerId, tx, 'desc');
            return payments.find((payment) => payment.id === paymentId) || null;
        });
    }

    async getPayments(id: string) {
        await this.ensureExists(id);
        return this.getCustomerPaymentsWithAllocations(BigInt(id), this.prisma, 'desc');
    }

    async deletePayment(customerId: string, paymentId: string) {
        const customer = await this.ensureExists(customerId);

        const customerIdBigint = BigInt(customerId);
        const paymentIdBigint = BigInt(paymentId);

        return this.prisma.$transaction(async (tx) => {
            const payments = await tx.$queryRaw<Array<{
                id: bigint;
                amount: Prisma.Decimal | number | string;
                method: string | null;
            }>>(Prisma.sql`
                SELECT "id", "amount", "method"
                FROM "customer_payment"
                WHERE "id" = ${paymentIdBigint}
                  AND "customer_id" = ${customerIdBigint}
                LIMIT 1
            `);

            if (payments.length === 0) {
                throw new NotFoundException('PAYMENT_NOT_FOUND');
            }

            const payment = payments[0];
            const paymentAmount = Number(payment.amount || 0);
            const paymentMethod = this.normalizePaymentMethod(payment.method || undefined);

            const allocations = await tx.$queryRaw<Array<{
                invoiceId: bigint;
                amount: Prisma.Decimal | number | string;
            }>>(Prisma.sql`
                SELECT "invoice_id" AS "invoiceId", "amount"
                FROM "customer_payment_allocation"
                WHERE "payment_id" = ${payment.id}
                ORDER BY "created_at" ASC, "id" ASC
            `);

            for (const allocation of allocations) {
                const invoice = await tx.invoice.findUnique({
                    where: { id: allocation.invoiceId },
                    select: {
                        id: true,
                        totalAmount: true,
                        amountPaid: true,
                        amountDue: true,
                        paymentMethod: true,
                        cashAmount: true,
                        cardAmount: true,
                        transferAmount: true,
                    },
                });

                if (!invoice) {
                    continue;
                }

                const allocationAmount = Math.max(0, Number(allocation.amount || 0));
                const totalAmount = Math.max(0, Number(invoice.totalAmount || 0));
                const currentPaid = Math.max(0, Number(invoice.amountPaid || 0));
                const newPaid = Math.max(0, currentPaid - allocationAmount);
                const newDue = Math.max(0, totalAmount - newPaid);

                const currentCash = Math.max(0, Number(invoice.cashAmount || 0));
                const currentCard = Math.max(0, Number(invoice.cardAmount || 0));
                const currentTransfer = Math.max(0, Number(invoice.transferAmount || 0));

                const newCash = paymentMethod === 'CASH'
                    ? Math.max(0, currentCash - allocationAmount)
                    : currentCash;
                const newCard = paymentMethod === 'CARD'
                    ? Math.max(0, currentCard - allocationAmount)
                    : currentCard;
                const newTransfer = paymentMethod === 'TRANSFER'
                    ? Math.max(0, currentTransfer - allocationAmount)
                    : currentTransfer;

                await tx.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        amountPaid: newPaid,
                        amountDue: newDue,
                        cashAmount: newCash,
                        cardAmount: newCard,
                        transferAmount: newTransfer,
                        paymentMethod: this.resolveInvoicePaymentMethodFromAmounts(newCash, newCard, newTransfer),
                    },
                });
            }

            await tx.$executeRaw(Prisma.sql`
                DELETE FROM "customer_payment"
                WHERE "id" = ${payment.id}
            `);

            const currentDebt = Math.max(0, Number(customer.currentDebt || 0));
            await this.recalculateCurrentDebt(customer, tx, Math.max(0, currentDebt + paymentAmount));

            return { success: true, message: 'Đã xóa phiếu thu thành công' };
        });
    }

    // Get customer's debt summary with transactions
    async getDebts(id: string, filter?: string) {
        const customer = await this.ensureExists(id);

        const invoiceWhere = this.getCustomerInvoiceWhere(customer);
        const invoices = await this.prisma.invoice.findMany({
            where: invoiceWhere,
            orderBy: { createdAt: 'asc' }, // Oldest first for running balance
            include: {
                items: true,
            },
        });

        const customerPayments = await this.getCustomerPaymentsWithAllocations(BigInt(id), this.prisma, 'asc');

        const rawTransactions: Array<{
            id: string;
            code: string;
            time: Date;
            type: string;
            value: number;
            items?: TransactionItem[];
            note?: string;
        }> = [];

        // Check if customer has imported debt data
        const hasImportedData = customer.currentDebt !== null && customer.totalSales !== null;

        if (hasImportedData && invoices.length === 0) {
            if (customerPayments.length === 0) {
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

            const openingDebt = Math.max(
                0,
                Number(customer.currentDebt || 0)
                + customerPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
            );

            rawTransactions.push({
                id: 'opening-balance',
                code: 'SODUDAUKY',
                time: customer.createdAt,
                type: 'Dư đầu kỳ',
                value: openingDebt,
                note: 'Số dư công nợ trước khi ghi nhận phiếu thu',
            });

            for (const payment of customerPayments) {
                rawTransactions.push({
                    id: payment.id.toString(),
                    code: payment.code || `PT${payment.id}`,
                    time: payment.createdAt,
                    type: 'Thanh toán',
                    value: -Number(payment.amount || 0),
                    note: payment.note || undefined,
                });
            }

            const transactions = rawTransactions
                .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
                .reduce<Array<{
                    id: string;
                    code: string;
                    time: Date;
                    type: string;
                    value: number;
                    runningBalance: number;
                    items?: TransactionItem[];
                    note?: string;
                }>>((acc, transaction) => {
                    const runningBalance = (acc[acc.length - 1]?.runningBalance || 0) + transaction.value;
                    acc.push({
                        ...transaction,
                        runningBalance,
                    });
                    return acc;
                }, []);

            let filteredTransactions = transactions;
            if (filter && filter !== 'all') {
                filteredTransactions = transactions.filter((transaction) => transaction.type === filter);
            }

            filteredTransactions = [...filteredTransactions].sort(
                (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
            );

            return {
                customerId: id,
                customerName: customer.name,
                customerCode: customer.code,
                totalSales: Number(customer.totalSales || 0),
                totalPaid: Number(customer.totalSales || 0) - Number(customer.currentDebt || 0),
                totalDebt: Number(customer.currentDebt || 0),
                transactionCount: filteredTransactions.length,
                transactions: filteredTransactions,
            };
        }

        const allocatedAmountByInvoiceId = new Map<string, number>();
        customerPayments.forEach((payment) => {
            payment.allocations.forEach((allocation) => {
                const invoiceId = allocation.invoiceId.toString();
                const existingAmount = allocatedAmountByInvoiceId.get(invoiceId) || 0;
                allocatedAmountByInvoiceId.set(invoiceId, existingAmount + Number(allocation.amount || 0));
            });
        });

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
                rawTransactions.push({
                    id: inv.id.toString(),
                    code: inv.invoiceNumber || `HD${inv.id}`,
                    time: inv.createdAt,
                    type: 'Bán hàng',
                    value: invoiceAmount,
                    items: invoiceItems, // Include items for sale transactions
                });
            }

            const allocatedLater = allocatedAmountByInvoiceId.get(inv.id.toString()) || 0;
            const initialPaidAmount = Math.max(0, paidAmount - allocatedLater);
            if (initialPaidAmount > 0) {
                rawTransactions.push({
                    id: `${inv.id}-initial-payment`,
                    code: inv.invoiceNumber || `HD${inv.id}`,
                    time: inv.createdAt,
                    type: 'Thanh toán',
                    value: -initialPaidAmount,
                    note: 'Thanh toán lúc tạo đơn',
                });
            }
        }

        for (const payment of customerPayments) {
            rawTransactions.push({
                id: payment.id.toString(),
                code: payment.code || `PT${payment.id}`,
                time: payment.createdAt,
                type: 'Thanh toán',
                value: -Number(payment.amount || 0),
                note: payment.note || undefined,
            });
        }

        const transactions = rawTransactions
            .sort((a, b) => {
                const timeDiff = new Date(a.time).getTime() - new Date(b.time).getTime();
                if (timeDiff !== 0) {
                    return timeDiff;
                }

                if (a.type === b.type) return 0;
                return a.type === 'Bán hàng' ? -1 : 1;
            })
            .reduce<Array<{
                id: string;
                code: string;
                time: Date;
                type: string;
                value: number;
                runningBalance: number;
                items?: TransactionItem[];
                note?: string;
            }>>((acc, transaction) => {
                const runningBalance = (acc[acc.length - 1]?.runningBalance || 0) + transaction.value;
                acc.push({
                    ...transaction,
                    runningBalance,
                });
                return acc;
            }, []);

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
        const totalDebt = Math.max(0, totalSales - totalPaid);

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
