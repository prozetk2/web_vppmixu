import { Body, Controller, Get, Post, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { InventoryService } from './inventory.service';
import { StockQueryDto, AdjustStockDto, MovementQueryDto } from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    /**
     * GET /inventory/stock
     * Get current stock levels with optional filters
     */
    @Get('stock')
    getStock(@Query() query: StockQueryDto) {
        return this.inventoryService.getStock(query);
    }

    /**
     * POST /inventory/adjust
     * Adjust stock (IMPORT, EXPORT, ADJUST)
     * Requires ADMIN or ACCOUNTANT role
     */
    @Post('adjust')
    @Roles('ADMIN', 'ACCOUNTANT')
    adjustStock(@Body() dto: AdjustStockDto, @Request() req: any) {
        const userId = req.user?.id ? BigInt(req.user.id) : undefined;
        return this.inventoryService.adjustStock(dto, userId);
    }

    /**
     * GET /inventory/movements
     * Get stock movement history
     */
    @Get('movements')
    getMovements(@Query() query: MovementQueryDto) {
        return this.inventoryService.getMovements(query);
    }
}
