import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    /**
     * GET /reports/revenue
     * Revenue report with summary, chart data, and details
     */
    @Get('revenue')
    getRevenueReport(@Query() query: ReportQueryDto) {
        return this.reportsService.getRevenueReport(query);
    }

    /**
     * GET /reports/inventory-value
     * Inventory value report grouped by category and warehouse
     */
    @Get('inventory-value')
    getInventoryValueReport(@Query() query: ReportQueryDto) {
        return this.reportsService.getInventoryValueReport(query);
    }

    /**
     * GET /reports/customer-debts
     * Customer debts with aging analysis
     */
    @Get('customer-debts')
    getCustomerDebtsReport(@Query() query: ReportQueryDto) {
        return this.reportsService.getCustomerDebtsReport(query);
    }

    /**
     * GET /reports/supplier-debts
     * Supplier debts report
     */
    @Get('supplier-debts')
    getSupplierDebtsReport(@Query() query: ReportQueryDto) {
        return this.reportsService.getSupplierDebtsReport(query);
    }

    /**
     * GET /reports/product-sales
     * Product sales report with profit calculation
     */
    @Get('product-sales')
    getProductSalesReport(@Query() query: ReportQueryDto) {
        return this.reportsService.getProductSalesReport(query);
    }

    /**
     * GET /reports/revenue/export
     * Export revenue report to flat rows for Excel/CSV
     */
    @Get('revenue/export')
    exportRevenueReport(@Query() query: ReportQueryDto) {
        return this.reportsService.exportRevenueReport(query);
    }

    /**
     * GET /reports/inventory-value/export
     * Export inventory value report to flat rows for Excel/CSV
     */
    @Get('inventory-value/export')
    exportInventoryValueReport(@Query() query: ReportQueryDto) {
        return this.reportsService.exportInventoryValueReport(query);
    }
}
