import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    /**
     * GET /dashboard/stats
     * Get summary stats (revenue, returns, net revenue)
     */
    @Get('stats')
    getStats(@Query() query: DashboardQueryDto) {
        return this.dashboardService.getStats(query);
    }

    /**
     * GET /dashboard/revenue-chart
     * Get revenue chart data by day
     */
    @Get('revenue-chart')
    getRevenueChart(@Query() query: DashboardQueryDto) {
        return this.dashboardService.getRevenueChart(query);
    }

    /**
     * GET /dashboard/top-products
     * Get top 10 best-selling products
     */
    @Get('top-products')
    getTopProducts(@Query() query: DashboardQueryDto) {
        return this.dashboardService.getTopProducts(query);
    }

    /**
     * GET /dashboard/top-customers
     * Get top 10 customers by purchase amount
     */
    @Get('top-customers')
    getTopCustomers(@Query() query: DashboardQueryDto) {
        return this.dashboardService.getTopCustomers(query);
    }

    /**
     * GET /dashboard/recent-activities
     * Get recent order activities
     */
    @Get('recent-activities')
    getRecentActivities() {
        return this.dashboardService.getRecentActivities();
    }
}
