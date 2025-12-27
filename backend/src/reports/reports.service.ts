import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportQueryDto } from './dto';

@Injectable()
export class ReportsService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get revenue report grouped by day/week/month
     * Uses Invoice table as the main data source
     */
    async getRevenueReport(query: ReportQueryDto) {
        const { fromDate, toDate, storeId, groupBy = 'day' } = query;

        // Default: This month
        const now = new Date();
        const start = fromDate ? new Date(fromDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = toDate ? new Date(toDate) : now;
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        // Get invoices in date range
        const whereClause: any = {
            createdAt: { gte: start, lte: end },
            status: { not: 'CANCELLED' },
        };

        if (storeId) {
            whereClause.storeId = BigInt(storeId);
        }

        const invoices = await this.prisma.invoice.findMany({
            where: whereClause,
            select: {
                id: true,
                invoiceNumber: true,
                totalAmount: true,
                discountAmount: true,
                taxAmount: true,
                status: true,
                createdAt: true,
                customerName: true,
                returnOrderCode: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        // Calculate totals
        const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
        const totalDiscount = invoices.reduce((sum, inv) => sum + Number(inv.discountAmount || 0), 0);
        const totalTax = invoices.reduce((sum, inv) => sum + Number(inv.taxAmount || 0), 0);
        const orderCount = invoices.length;

        // Get returns (invoices with returnOrderCode)
        const returnInvoices = invoices.filter(inv => inv.returnOrderCode !== null);
        const returnAmount = returnInvoices.reduce((sum, inv) => sum + Math.abs(Number(inv.totalAmount || 0)), 0);
        const returnCount = returnInvoices.length;
        const netRevenue = totalRevenue - returnAmount;

        // Group by period
        const groupedData = this.groupByPeriod(invoices.map(inv => ({
            ...inv,
            orderNumber: inv.invoiceNumber,
        })), groupBy);

        return {
            summary: {
                totalRevenue,
                totalDiscount,
                totalTax,
                returnAmount,
                netRevenue,
                orderCount,
                returnCount,
                averageOrderValue: orderCount > 0 ? netRevenue / orderCount : 0,
            },
            chartData: groupedData,
            details: invoices.map(inv => ({
                id: inv.id.toString(),
                orderNumber: inv.invoiceNumber,
                customerName: inv.customerName || 'Khách lẻ',
                totalAmount: Number(inv.totalAmount),
                status: inv.status,
                createdAt: inv.createdAt,
            })),
        };
    }

    /**
     * Get inventory value report
     */
    async getInventoryValueReport(query: ReportQueryDto) {
        const { warehouseId } = query;

        const whereClause: any = {};
        if (warehouseId) {
            whereClause.warehouseId = BigInt(warehouseId);
        }

        // Get inventory with product details
        const inventory = await this.prisma.inventory.findMany({
            where: whereClause,
            include: {
                variant: {
                    include: {
                        product: {
                            include: {
                                category: true,
                            },
                        },
                    },
                },
                warehouse: true,
            },
        });

        // Calculate values
        let totalValue = 0;
        let totalQuantity = 0;
        const byCategory: Record<string, { name: string; quantity: number; value: number }> = {};
        const byWarehouse: Record<string, { name: string; quantity: number; value: number }> = {};

        const items = inventory.map(inv => {
            const qty = Number(inv.quantity);
            const cost = Number(inv.variant.cost || inv.variant.product.defaultCost || 0);
            const value = qty * cost;

            totalQuantity += qty;
            totalValue += value;

            // Group by category
            const catName = inv.variant.product.category?.name || 'Không có danh mục';
            const catId = inv.variant.product.categoryId?.toString() || '0';
            if (!byCategory[catId]) {
                byCategory[catId] = { name: catName, quantity: 0, value: 0 };
            }
            byCategory[catId].quantity += qty;
            byCategory[catId].value += value;

            // Group by warehouse
            const whName = inv.warehouse.name;
            const whId = inv.warehouseId.toString();
            if (!byWarehouse[whId]) {
                byWarehouse[whId] = { name: whName, quantity: 0, value: 0 };
            }
            byWarehouse[whId].quantity += qty;
            byWarehouse[whId].value += value;

            return {
                productId: inv.variant.productId.toString(),
                productName: inv.variant.product.name,
                sku: inv.variant.product.sku,
                category: catName,
                warehouse: whName,
                quantity: qty,
                unitCost: cost,
                totalValue: value,
            };
        });

        return {
            summary: {
                totalQuantity,
                totalValue,
                itemCount: items.length,
            },
            byCategory: Object.values(byCategory).sort((a, b) => b.value - a.value),
            byWarehouse: Object.values(byWarehouse).sort((a, b) => b.value - a.value),
            items: items.sort((a, b) => b.totalValue - a.totalValue),
        };
    }

    /**
     * Get customer debts report
     */
    async getCustomerDebtsReport(query: ReportQueryDto) {
        // Get customers with debt info
        const customers = await this.prisma.customer.findMany({
            where: {
                OR: [
                    { currentDebt: { gt: 0 } },
                    { totalSales: { gt: 0 } },
                ],
            },
            select: {
                id: true,
                code: true,
                name: true,
                phone: true,
                email: true,
                currentDebt: true,
                debtDays: true,
                totalSales: true,
                totalSalesAfterReturn: true,
                lastTransaction: true,
            },
            orderBy: { currentDebt: 'desc' },
        });

        // Calculate aging buckets
        const now = new Date();
        const aging = {
            current: 0,      // 0-30 days
            overdue30: 0,    // 31-60 days
            overdue60: 0,    // 61-90 days
            overdue90: 0,    // 90+ days
        };

        const items = customers.map(c => {
            const debt = Number(c.currentDebt || 0);
            const days = c.debtDays || 0;

            if (days <= 30) aging.current += debt;
            else if (days <= 60) aging.overdue30 += debt;
            else if (days <= 90) aging.overdue60 += debt;
            else aging.overdue90 += debt;

            return {
                id: c.id.toString(),
                code: c.code,
                name: c.name,
                phone: c.phone,
                email: c.email,
                currentDebt: debt,
                debtDays: days,
                totalSales: Number(c.totalSales || 0),
                lastTransaction: c.lastTransaction,
            };
        });

        const totalDebt = items.reduce((sum, i) => sum + i.currentDebt, 0);

        return {
            summary: {
                totalDebt,
                customerCount: items.length,
                aging,
            },
            items,
        };
    }

    /**
     * Get supplier debts report
     */
    async getSupplierDebtsReport(query: ReportQueryDto) {
        // Get suppliers with debt info
        const suppliers = await this.prisma.supplier.findMany({
            where: {
                OR: [
                    { currentDebt: { gt: 0 } },
                    { totalPurchase: { gt: 0 } },
                ],
            },
            select: {
                id: true,
                code: true,
                name: true,
                phone: true,
                email: true,
                currentDebt: true,
                totalPurchase: true,
                totalPurchaseAfterReturn: true,
            },
            orderBy: { currentDebt: 'desc' },
        });

        const items = suppliers.map(s => ({
            id: s.id.toString(),
            code: s.code,
            name: s.name,
            phone: s.phone,
            email: s.email,
            currentDebt: Number(s.currentDebt || 0),
            totalPurchase: Number(s.totalPurchase || 0),
        }));

        const totalDebt = items.reduce((sum, i) => sum + i.currentDebt, 0);

        return {
            summary: {
                totalDebt,
                supplierCount: items.length,
            },
            items,
        };
    }

    /**
     * Get product sales report
     */
    async getProductSalesReport(query: ReportQueryDto) {
        const { fromDate, toDate, storeId } = query;

        const now = new Date();
        const start = fromDate ? new Date(fromDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = toDate ? new Date(toDate) : now;

        const whereClause: any = {
            order: {
                createdAt: { gte: start, lte: end },
                status: { not: 'CANCELLED' },
            },
        };

        if (storeId) {
            whereClause.order.storeId = BigInt(storeId);
        }

        const orderItems = await this.prisma.orderItem.findMany({
            where: whereClause,
            include: {
                variant: {
                    include: {
                        product: {
                            include: { category: true },
                        },
                    },
                },
            },
        });

        // Group by product
        const productMap = new Map<string, {
            name: string;
            sku: string;
            category: string;
            quantity: number;
            revenue: number;
            cost: number;
            profit: number;
        }>();

        orderItems.forEach(item => {
            const productId = item.variant.productId.toString();
            const product = item.variant.product;
            const qty = Number(item.quantity);
            const rev = Number(item.totalPrice);
            const cost = qty * Number(item.variant.cost || product.defaultCost || 0);

            const existing = productMap.get(productId) || {
                name: product.name,
                sku: product.sku || '',
                category: product.category?.name || 'Không có danh mục',
                quantity: 0,
                revenue: 0,
                cost: 0,
                profit: 0,
            };

            existing.quantity += qty;
            existing.revenue += rev;
            existing.cost += cost;
            existing.profit = existing.revenue - existing.cost;

            productMap.set(productId, existing);
        });

        const items = Array.from(productMap.entries())
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.revenue - a.revenue);

        const totalRevenue = items.reduce((sum, i) => sum + i.revenue, 0);
        const totalCost = items.reduce((sum, i) => sum + i.cost, 0);
        const totalProfit = items.reduce((sum, i) => sum + i.profit, 0);
        const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

        return {
            summary: {
                totalRevenue,
                totalCost,
                totalProfit,
                totalQuantity,
                productCount: items.length,
                profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
            },
            items,
        };
    }

    // Helper: Group orders by period
    private groupByPeriod(orders: any[], groupBy: string) {
        const grouped = new Map<string, number>();

        orders.forEach(order => {
            const date = new Date(order.createdAt);
            let key: string;

            switch (groupBy) {
                case 'week':
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    key = weekStart.toISOString().split('T')[0];
                    break;
                case 'month':
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    break;
                case 'year':
                    key = date.getFullYear().toString();
                    break;
                default: // day
                    key = date.toISOString().split('T')[0];
            }

            const current = grouped.get(key) || 0;
            grouped.set(key, current + Number(order.totalAmount || 0));
        });

        return Array.from(grouped.entries())
            .map(([date, value]) => ({ date, value }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    /**
     * Export revenue report to flat rows for Excel/CSV
     * Uses Invoice table instead of Order since invoice data is the main source
     */
    async exportRevenueReport(query: ReportQueryDto) {
        const { fromDate, toDate, storeId } = query;

        const now = new Date();
        const start = fromDate ? new Date(fromDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = toDate ? new Date(toDate) : now;
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        const whereClause: any = {
            createdAt: { gte: start, lte: end },
            status: { not: 'CANCELLED' },
        };

        if (storeId) {
            whereClause.storeId = BigInt(storeId);
        }

        // Use Invoice table instead of Order
        const invoices = await this.prisma.invoice.findMany({
            where: whereClause,
            include: {
                items: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        const rows: any[] = [];
        for (const invoice of invoices) {
            for (const item of invoice.items) {
                rows.push({
                    'Mã HĐ': invoice.invoiceNumber || invoice.id.toString(),
                    'Chi nhánh': invoice.branch || '',
                    'Khách hàng': invoice.customerName || 'Khách lẻ',
                    'Mã SP': item.productCode || '',
                    'Tên SP': item.productName || '',
                    'ĐVT': item.unit || '',
                    'SL': Number(item.quantity),
                    'Đơn giá': Number(item.unitPrice),
                    'Giảm giá': Number(item.discountAmount || 0),
                    'Thành tiền': Number(item.totalPrice),
                    'Trạng thái': invoice.status === 'CANCELLED' ? 'Đã hủy' : 'Hoàn thành',
                    'Ngày tạo': invoice.createdAt?.toISOString().slice(0, 10) || '',
                    'Người bán': invoice.seller || '',
                    'Kênh bán': invoice.salesChannel || '',
                });
            }
        }

        return rows;
    }

    /**
     * Export inventory value report to flat rows for Excel/CSV
     */
    async exportInventoryValueReport(query: ReportQueryDto) {
        const { warehouseId } = query;

        const whereClause: any = {};
        if (warehouseId) {
            whereClause.warehouseId = BigInt(warehouseId);
        }

        const inventory = await this.prisma.inventory.findMany({
            where: whereClause,
            include: {
                variant: {
                    include: {
                        product: {
                            include: { category: true },
                        },
                    },
                },
                warehouse: true,
            },
        });

        const rows = inventory.map(inv => {
            const qty = Number(inv.quantity);
            const cost = Number(inv.variant.cost || inv.variant.product.defaultCost || 0);
            const value = qty * cost;

            return {
                'Mã SP': inv.variant.product.sku || '',
                'Tên SP': inv.variant.product.name,
                'Danh mục': inv.variant.product.category?.name || 'Không có danh mục',
                'Kho': inv.warehouse.name,
                'SL tồn': qty,
                'Đơn giá': cost,
                'Giá trị': value,
            };
        });

        return rows.sort((a, b) => b['Giá trị'] - a['Giá trị']);
    }
}
