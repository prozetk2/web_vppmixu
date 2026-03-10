import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class InvoicesService {
    constructor(
        private prisma: PrismaService,
        private inventoryService: InventoryService,
    ) { }

    async findAll(query: InvoiceQueryDto) {
        const where: Prisma.InvoiceWhereInput = {};

        // Search by invoice number
        if (query.search) {
            where.OR = [
                { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
                { customerName: { contains: query.search, mode: 'insensitive' } },
                { customerCode: { contains: query.search, mode: 'insensitive' } },
            ];
        }

        // Date range filter
        if (query.dateFrom || query.dateTo) {
            where.createdAt = {};
            if (query.dateFrom) {
                where.createdAt.gte = new Date(query.dateFrom);
            }
            if (query.dateTo) {
                const endDate = new Date(query.dateTo);
                endDate.setHours(23, 59, 59, 999);
                where.createdAt.lte = endDate;
            }
        }

        // Status filter
        if (query.status) {
            where.status = query.status;
        }

        // E-invoice status filter
        if (query.eInvoiceStatus) {
            where.eInvoiceStatus = query.eInvoiceStatus;
        }

        // Payment method filter
        if (query.paymentMethod) {
            where.paymentMethod = query.paymentMethod;
        }

        // Creator filter
        if (query.creator) {
            where.creator = { contains: query.creator, mode: 'insensitive' };
        }

        // Seller filter
        if (query.seller) {
            where.seller = { contains: query.seller, mode: 'insensitive' };
        }

        // Price list filter
        if (query.priceList) {
            where.priceList = query.priceList;
        }

        // Sales channel filter
        if (query.salesChannel) {
            where.salesChannel = query.salesChannel;
        }

        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;

        // Sorting
        const orderBy: Prisma.InvoiceOrderByWithRelationInput = {};
        const sortBy = query.sortBy || 'createdAt';
        orderBy[sortBy] = query.sortOrder || 'desc';

        const [data, total] = await Promise.all([
            this.prisma.invoice.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: {
                    customer: {
                        select: { id: true, code: true, name: true, phone: true, email: true },
                    },
                    items: true,
                },
            }),
            this.prisma.invoice.count({ where }),
        ]);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: number) {
        try {
            // Use raw query to get all invoice fields since Prisma client may be outdated
            const invoices = await this.prisma.$queryRaw`
                SELECT * FROM invoice WHERE id = ${BigInt(id)}
            `;

            const invoiceData = (invoices as any[])[0];

            // DEBUG: Log all column names and values
            console.log('Raw invoice data columns:', Object.keys(invoiceData || {}));
            console.log('Raw invoice data:', JSON.stringify(invoiceData, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
                , 2));

            if (!invoiceData) {
                throw new NotFoundException(`Invoice #${id} not found`);
            }

            // Get invoice items
            let items: any[] = [];
            try {
                const invoiceItems = await this.prisma.$queryRaw`
                    SELECT * FROM invoice_item WHERE invoice_id = ${BigInt(id)}
                `;
                items = invoiceItems as any[];
            } catch (e) {
                console.log('Invoice items not available:', e);
            }

            // Get customer info if exists
            let customer = null;
            if (invoiceData.customer_id) {
                try {
                    const customers = await this.prisma.$queryRaw`
                        SELECT * FROM customer WHERE id = ${invoiceData.customer_id}
                    `;
                    customer = (customers as any[])[0] || null;
                } catch (e) {
                    console.log('Customer not available:', e);
                }
            }

            // Convert snake_case to camelCase for frontend compatibility
            return {
                id: invoiceData.id?.toString(),
                invoiceNumber: invoiceData.invoice_number,
                branch: invoiceData.branch,
                orderCode: invoiceData.order_code,
                returnOrderCode: invoiceData.return_order_code,
                customerCode: invoiceData.customer_code,
                customerName: invoiceData.customer_name,
                customerEmail: invoiceData.customer_email,
                customerPhone: invoiceData.customer_phone,
                customerAddress: invoiceData.customer_address,
                customerArea: invoiceData.customer_area,
                customerWard: invoiceData.customer_ward,
                priceList: invoiceData.price_list,
                seller: invoiceData.seller,
                salesChannel: invoiceData.sales_channel,
                creator: invoiceData.creator,
                notes: invoiceData.notes,
                totalAmount: invoiceData.total_amount,
                discountAmount: invoiceData.discount_amount,
                amountDue: invoiceData.amount_due,
                amountPaid: invoiceData.amount_paid,
                cashAmount: invoiceData.cash_amount,
                cardAmount: invoiceData.card_amount,
                walletAmount: invoiceData.wallet_amount,
                transferAmount: invoiceData.transfer_amount,
                status: invoiceData.status,
                eInvoiceStatus: invoiceData.einvoice_status,
                paymentMethod: invoiceData.payment_method,
                issuedAt: invoiceData.issued_at,
                createdAt: invoiceData.created_at,
                updatedAt: invoiceData.updated_at,
                customer,
                items: items.map((item: any) => ({
                    id: item.id?.toString(),
                    productCode: item.product_code,
                    barcode: item.barcode,
                    productName: item.product_name,
                    brand: item.brand,
                    unit: item.unit,
                    notes: item.notes,
                    quantity: item.quantity,
                    unitPrice: item.unit_price,
                    discountPercent: item.discount_percent,
                    discountAmount: item.discount_amount,
                    salePrice: item.sale_price,
                    totalPrice: item.total_price,
                })),
            };
        } catch (error: any) {
            console.error('FindOne error:', error.message);
            throw error;
        }
    }

    async create(dto: CreateInvoiceDto) {
        const { items, ...invoiceData } = dto;

        // Generate invoice number if not provided
        if (!invoiceData.invoiceNumber) {
            const count = await this.prisma.invoice.count();
            invoiceData.invoiceNumber = `HD${String(count + 1).padStart(8, '0')}`;
        }

        // Parse customerDob if provided
        const customerDob = dto.customerDob ? new Date(dto.customerDob) : null;
        const issuedAt = dto.issuedAt ? new Date(dto.issuedAt) : new Date();

        // Use transaction for atomic operation
        return this.prisma.$transaction(async (tx) => {
            // Create invoice
            const invoice = await tx.invoice.create({
                data: {
                    invoiceNumber: invoiceData.invoiceNumber,
                    branch: invoiceData.branch,
                    orderCode: invoiceData.orderCode,
                    returnOrderCode: invoiceData.returnOrderCode,
                    customerCode: invoiceData.customerCode,
                    customerName: invoiceData.customerName,
                    customerEmail: invoiceData.customerEmail,
                    customerPhone: invoiceData.customerPhone,
                    customerAddress: invoiceData.customerAddress,
                    customerArea: invoiceData.customerArea,
                    customerWard: invoiceData.customerWard,
                    customerDob,
                    priceList: invoiceData.priceList,
                    seller: invoiceData.seller,
                    salesChannel: invoiceData.salesChannel,
                    creator: invoiceData.creator,
                    notes: invoiceData.notes,
                    totalAmount: invoiceData.totalAmount,
                    discountAmount: invoiceData.discountAmount || 0,
                    amountDue: invoiceData.amountDue,
                    amountPaid: invoiceData.amountPaid || 0,
                    cashAmount: invoiceData.cashAmount || 0,
                    cardAmount: invoiceData.cardAmount || 0,
                    walletAmount: invoiceData.walletAmount || 0,
                    transferAmount: invoiceData.transferAmount || 0,
                    status: invoiceData.status || 'COMPLETED',
                    eInvoiceStatus: invoiceData.eInvoiceStatus,
                    paymentMethod: invoiceData.paymentMethod,
                    issuedAt,
                    createdAt: dto.createdAt ? new Date(dto.createdAt) : undefined,
                    items: items?.length
                        ? {
                            create: items.map((item) => ({
                                productCode: item.productCode,
                                barcode: item.barcode,
                                productName: item.productName,
                                brand: item.brand,
                                unit: item.unit,
                                notes: item.notes,
                                quantity: item.quantity || 0,
                                unitPrice: item.unitPrice || 0,
                                discountPercent: item.discountPercent || 0,
                                discountAmount: item.discountAmount || 0,
                                salePrice: item.salePrice,
                                totalPrice: item.totalPrice || 0,
                            })),
                        }
                        : undefined,
                },
                include: { items: true },
            });

            // Auto-deduct inventory (if items exist)
            if (items && items.length > 0) {
                try {
                    const validItems = items.filter(item => item.productCode);
                    if (validItems.length > 0) {
                        await this.inventoryService.deductInventoryFromSale(
                            validItems.map(item => ({
                                productCode: item.productCode!,
                                quantity: Number(item.quantity) || 0,
                                unitPrice: Number(item.unitPrice) || 0,
                            })),
                            invoice.invoiceNumber || 'UNKNOWN',
                            undefined, // Use default warehouse
                            dto.storeId, // Company for this sale (for reporting)
                            undefined, // performedBy - can add later
                        );
                    }
                } catch (error) {
                    // Log error but don't fail invoice creation
                    console.error('Inventory deduct failed:', error.message);
                    // If you want strict inventory control, uncomment this:
                    // throw error;
                }
            }

            return invoice;
        });
    }

    async bulkCreate(dtos: CreateInvoiceDto[]) {
        const results: Array<{ success: boolean; invoice?: any; error?: string; data?: CreateInvoiceDto }> = [];
        for (const dto of dtos) {
            try {
                const invoice = await this.create(dto);
                results.push({ success: true, invoice });
            } catch (error: any) {
                results.push({ success: false, error: error.message, data: dto });
            }
        }
        return results;
    }

    async update(id: number, dto: UpdateInvoiceDto) {
        const existing = await this.prisma.invoice.findUnique({
            where: { id: BigInt(id) },
        });

        if (!existing) {
            throw new NotFoundException(`Invoice #${id} not found`);
        }

        const { items, storeId, ...invoiceData } = dto;

        // Parse dates
        const customerDob = dto.customerDob ? new Date(dto.customerDob) : undefined;
        const issuedAt = dto.issuedAt ? new Date(dto.issuedAt) : undefined;

        return this.prisma.invoice.update({
            where: { id: BigInt(id) },
            data: {
                ...invoiceData,
                customerDob,
                issuedAt,
                // Convert storeId string to BigInt if provided
                storeId: storeId ? BigInt(storeId) : undefined,
                createdAt: dto.createdAt ? new Date(dto.createdAt) : undefined,
                // Update items if provided
                items: items?.length
                    ? {
                        deleteMany: {},
                        create: items.map((item) => ({
                            productCode: item.productCode,
                            barcode: item.barcode,
                            productName: item.productName,
                            brand: item.brand,
                            unit: item.unit,
                            notes: item.notes,
                            quantity: item.quantity || 0,
                            unitPrice: item.unitPrice || 0,
                            discountPercent: item.discountPercent || 0,
                            discountAmount: item.discountAmount || 0,
                            salePrice: item.salePrice,
                            totalPrice: item.totalPrice || 0,
                        })),
                    }
                    : undefined,
            },
            include: { items: true },
        });
    }

    async delete(id: number) {
        const existing = await this.prisma.invoice.findUnique({
            where: { id: BigInt(id) },
        });

        if (!existing) {
            throw new NotFoundException(`Invoice #${id} not found`);
        }

        return this.prisma.invoice.delete({
            where: { id: BigInt(id) },
        });
    }

    // Get distinct values for filter dropdowns
    async getFilterOptions() {
        const [creators, sellers, priceLists, salesChannels, paymentMethods] = await Promise.all([
            this.prisma.invoice.findMany({
                where: { creator: { not: null } },
                distinct: ['creator'],
                select: { creator: true },
            }),
            this.prisma.invoice.findMany({
                where: { seller: { not: null } },
                distinct: ['seller'],
                select: { seller: true },
            }),
            this.prisma.invoice.findMany({
                where: { priceList: { not: null } },
                distinct: ['priceList'],
                select: { priceList: true },
            }),
            this.prisma.invoice.findMany({
                where: { salesChannel: { not: null } },
                distinct: ['salesChannel'],
                select: { salesChannel: true },
            }),
            this.prisma.invoice.findMany({
                where: { paymentMethod: { not: null } },
                distinct: ['paymentMethod'],
                select: { paymentMethod: true },
            }),
        ]);

        return {
            creators: creators.map((c) => c.creator).filter(Boolean),
            sellers: sellers.map((s) => s.seller).filter(Boolean),
            priceLists: priceLists.map((p) => p.priceList).filter(Boolean),
            salesChannels: salesChannels.map((s) => s.salesChannel).filter(Boolean),
            paymentMethods: paymentMethods.map((p) => p.paymentMethod).filter(Boolean),
        };
    }
}
