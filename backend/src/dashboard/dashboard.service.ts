import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardQueryDto } from './dto';

@Injectable()
export class DashboardService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get summary stats for today
     */
    async getStats(query: DashboardQueryDto) {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);

        // Get previous period for comparison
        const prevStart = new Date(todayStart);
        prevStart.setDate(prevStart.getDate() - 1);
        const prevEnd = new Date(todayStart);

        // Aggregate orders for today
        const todayOrders = await this.prisma.order.aggregate({
            where: {
                createdAt: { gte: todayStart, lt: todayEnd },
                status: { not: 'CANCELLED' },
            },
            _sum: { totalAmount: true },
            _count: true,
        });

        // Aggregate orders for previous day
        const prevOrders = await this.prisma.order.aggregate({
            where: {
                createdAt: { gte: prevStart, lt: prevEnd },
                status: { not: 'CANCELLED' },
            },
            _sum: { totalAmount: true },
        });

        // Get returns (orders with status RETURNED)
        const todayReturns = await this.prisma.order.aggregate({
            where: {
                createdAt: { gte: todayStart, lt: todayEnd },
                status: 'RETURNED',
            },
            _sum: { totalAmount: true },
            _count: true,
        });

        const revenue = Number(todayOrders._sum.totalAmount || 0);
        const returns = Number(todayReturns._sum.totalAmount || 0);
        const netRevenue = revenue - returns;

        const prevRevenue = Number(prevOrders._sum.totalAmount || 0);
        const changePercent = prevRevenue > 0
            ? ((netRevenue - prevRevenue) / prevRevenue) * 100
            : netRevenue > 0 ? 100 : 0;

        return {
            revenue,
            returns,
            netRevenue,
            changePercent: Math.round(changePercent * 100) / 100,
            orderCount: todayOrders._count,
            returnCount: todayReturns._count,
        };
    }

    /**
     * Get revenue chart data by day
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

        // Get all orders in date range
        const orders = await this.prisma.order.findMany({
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
        orders.forEach((order) => {
            const dayKey = order.createdAt.toISOString().split('T')[0];
            const current = dailyMap.get(dayKey) || 0;
            dailyMap.set(dayKey, current + Number(order.totalAmount));
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
     */
    async getTopProducts(query: DashboardQueryDto) {
        const { fromDate, toDate } = query;

        // Default: this month
        const now = new Date();
        const start = fromDate ? new Date(fromDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = toDate ? new Date(toDate) : now;

        // Aggregate order items
        const orderItems = await this.prisma.orderItem.findMany({
            where: {
                order: {
                    createdAt: { gte: start, lte: end },
                    status: { not: 'CANCELLED' },
                },
            },
            include: {
                variant: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        // Group by product
        const productMap = new Map<string, { name: string; totalValue: number; quantity: number }>();
        orderItems.forEach((item) => {
            const productId = item.variant.productId.toString();
            const productName = item.variant.product.name;
            const existing = productMap.get(productId) || { name: productName, totalValue: 0, quantity: 0 };
            existing.totalValue += Number(item.totalPrice);
            existing.quantity += Number(item.quantity);
            productMap.set(productId, existing);
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
     */
    async getTopCustomers(query: DashboardQueryDto) {
        const { fromDate, toDate } = query;

        const now = new Date();
        const start = fromDate ? new Date(fromDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = toDate ? new Date(toDate) : now;

        // Get orders grouped by customer
        const orders = await this.prisma.order.findMany({
            where: {
                createdAt: { gte: start, lte: end },
                status: { not: 'CANCELLED' },
                customerId: { not: null },
            },
            include: {
                customer: true,
            },
        });

        // Group by customer
        const customerMap = new Map<string, { name: string; totalValue: number; orderCount: number }>();
        orders.forEach((order) => {
            if (!order.customer) return;
            const customerId = order.customerId!.toString();
            const customerName = order.customer.name;
            const existing = customerMap.get(customerId) || { name: customerName, totalValue: 0, orderCount: 0 };
            existing.totalValue += Number(order.totalAmount);
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
     */
    async getRecentActivities(limit: number = 10) {
        // Get recent orders
        const recentOrders = await this.prisma.order.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                customer: true,
            },
        });

        // Transform to activity format
        const activities = recentOrders.map((order) => ({
            id: order.id.toString(),
            type: 'ORDER' as const,
            description: order.customer
                ? `${order.customer.name} vừa bán đơn hàng`
                : 'Đơn hàng mới',
            value: Number(order.totalAmount),
            createdAt: order.createdAt,
            timeAgo: this.getTimeAgo(order.createdAt),
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
