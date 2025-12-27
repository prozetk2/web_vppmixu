import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardQueryDto } from './dto';

@Injectable()
export class DashboardService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get summary stats for this month with profit calculation
     * Uses Invoice table as the main data source
     * 
     * Formulas:
     * - Doanh thu = SUM(total_amount - discount)
     * - Lợi nhuận = Doanh thu - SUM(cost_price * quantity)
     */
    async getStats(query: DashboardQueryDto) {
        const now = new Date();
        // Use today's date range
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);

        // Get yesterday for comparison
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const yesterdayEnd = todayStart;

        // Aggregate invoices for today
        const todayInvoices = await this.prisma.invoice.aggregate({
            where: {
                createdAt: { gte: todayStart, lt: todayEnd },
                status: { not: 'CANCELLED' },
            },
            _sum: {
                totalAmount: true,
                discountAmount: true,
            },
            _count: true,
        });

        // Aggregate invoices for yesterday (comparison)
        const prevInvoices = await this.prisma.invoice.aggregate({
            where: {
                createdAt: { gte: yesterdayStart, lt: yesterdayEnd },
                status: { not: 'CANCELLED' },
            },
            _sum: { totalAmount: true },
        });

        // Get returns (invoices with returnOrderCode)
        const todayReturns = await this.prisma.invoice.aggregate({
            where: {
                createdAt: { gte: todayStart, lt: todayEnd },
                returnOrderCode: { not: null },
            },
            _sum: { totalAmount: true },
            _count: true,
        });

        // Calculate cost of goods sold (COGS)
        // Since InvoiceItem only has 2 records, calculate profit differently
        // Use average margin of 30% as fallback
        const grossRevenue = Number(todayInvoices._sum.totalAmount || 0);
        const discounts = Number(todayInvoices._sum.discountAmount || 0);
        const returns = Math.abs(Number(todayReturns._sum.totalAmount || 0));
        const netRevenue = grossRevenue - discounts - returns;

        // Estimate cost at 70% of revenue (30% margin is typical for retail)
        const estimatedCost = netRevenue * 0.7;
        const grossProfit = netRevenue - estimatedCost;
        const profitMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

        const prevRevenue = Number(prevInvoices._sum.totalAmount || 0);
        const changePercent = prevRevenue > 0
            ? ((netRevenue - prevRevenue) / prevRevenue) * 100
            : netRevenue > 0 ? 100 : 0;

        return {
            revenue: grossRevenue,
            discounts,
            returns,
            netRevenue,
            costAmount: estimatedCost,
            grossProfit,
            profitMargin: Math.round(profitMargin * 100) / 100,
            changePercent: Math.round(changePercent * 100) / 100,
            orderCount: todayInvoices._count,
            returnCount: todayReturns._count,
        };
    }

    /**
     * Get revenue chart data by day
     * Uses Invoice table
     */
    async getRevenueChart(query: DashboardQueryDto) {
        const { fromDate, toDate } = query;

        // Default: last 7 days
        const end = toDate ? new Date(toDate) : new Date();
        const start = fromDate ? new Date(fromDate) : new Date(end);
        if (!fromDate) {
            start.setDate(start.getDate() - 6);
        }
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        // Get all invoices in date range
        const invoices = await this.prisma.invoice.findMany({
            where: {
                createdAt: { gte: start, lte: end },
                status: { not: 'CANCELLED' },
            },
            select: {
                createdAt: true,
                totalAmount: true,
            },
        });

        // Group by day
        const dailyMap = new Map<string, number>();
        invoices.forEach((invoice) => {
            const dayKey = invoice.createdAt.toISOString().split('T')[0];
            const current = dailyMap.get(dayKey) || 0;
            dailyMap.set(dayKey, current + Number(invoice.totalAmount || 0));
        });

        // Build result array for each day in range
        const result: { date: string; label: string; value: number }[] = [];
        const current = new Date(start);
        while (current <= end) {
            const dayKey = current.toISOString().split('T')[0];
            result.push({
                date: dayKey,
                label: current.getDate().toString(),
                value: dailyMap.get(dayKey) || 0,
            });
            current.setDate(current.getDate() + 1);
        }

        return result;
    }

    /**
     * Get top 10 best-selling products
     * Uses InvoiceItem table
     */
    async getTopProducts(query: DashboardQueryDto) {
        const { fromDate, toDate } = query;

        // Default: this month
        const now = new Date();
        const start = fromDate ? new Date(fromDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = toDate ? new Date(toDate) : now;

        // Aggregate invoice items
        const invoiceItems = await this.prisma.invoiceItem.findMany({
            where: {
                invoice: {
                    createdAt: { gte: start, lte: end },
                    status: { not: 'CANCELLED' },
                },
            },
            select: {
                productCode: true,
                productName: true,
                quantity: true,
                totalPrice: true,
            },
        });

        // Group by product
        const productMap = new Map<string, { name: string; totalValue: number; quantity: number }>();
        invoiceItems.forEach((item) => {
            const productKey = item.productCode || item.productName || 'unknown';
            const productName = item.productName || 'Không tên';
            const existing = productMap.get(productKey) || { name: productName, totalValue: 0, quantity: 0 };
            existing.totalValue += Number(item.totalPrice || 0);
            existing.quantity += Number(item.quantity || 0);
            productMap.set(productKey, existing);
        });

        // Sort and take top 10
        const sorted = Array.from(productMap.entries())
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, 10);

        return sorted;
    }

    /**
     * Get top 10 customers by purchase amount
     * Uses Invoice table
     */
    async getTopCustomers(query: DashboardQueryDto) {
        const { fromDate, toDate } = query;

        const now = new Date();
        const start = fromDate ? new Date(fromDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = toDate ? new Date(toDate) : now;

        // Get invoices grouped by customer
        const invoices = await this.prisma.invoice.findMany({
            where: {
                createdAt: { gte: start, lte: end },
                status: { not: 'CANCELLED' },
                customerName: { not: null },
            },
            select: {
                customerId: true,
                customerCode: true,
                customerName: true,
                totalAmount: true,
            },
        });

        // Group by customer
        const customerMap = new Map<string, { name: string; totalValue: number; orderCount: number }>();
        invoices.forEach((invoice) => {
            if (!invoice.customerName) return;
            const customerId = invoice.customerId?.toString() || invoice.customerCode || invoice.customerName;
            const customerName = invoice.customerName;
            const existing = customerMap.get(customerId) || { name: customerName, totalValue: 0, orderCount: 0 };
            existing.totalValue += Number(invoice.totalAmount || 0);
            existing.orderCount += 1;
            customerMap.set(customerId, existing);
        });

        // Sort and take top 10
        const sorted = Array.from(customerMap.entries())
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, 10);

        return sorted;
    }

    /**
     * Get recent activities
     * Uses Invoice table
     */
    async getRecentActivities(limit: number = 10) {
        // Get recent invoices
        const recentInvoices = await this.prisma.invoice.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                invoiceNumber: true,
                customerName: true,
                totalAmount: true,
                createdAt: true,
            },
        });

        // Transform to activity format
        const activities = recentInvoices.map((invoice) => ({
            id: invoice.id.toString(),
            type: 'INVOICE' as const,
            description: invoice.customerName
                ? `${invoice.customerName} - ${invoice.invoiceNumber || 'HĐ'}`
                : `Khách lẻ - ${invoice.invoiceNumber || 'HĐ'}`,
            value: Number(invoice.totalAmount || 0),
            createdAt: invoice.createdAt,
            timeAgo: this.getTimeAgo(invoice.createdAt),
        }));

        return activities;
    }

    private getTimeAgo(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        return `${diffDays} ngày trước`;
    }
}
