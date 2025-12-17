import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
    constructor(private readonly salesService: SalesService) { }

    @Post()
    create(@Body() dto: CreateOrderDto) {
        return this.salesService.create(dto, dto.warehouseId);
    }

    @Get()
    findAll(@Query() query: OrderQueryDto) {
        return this.salesService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.salesService.findOne(id);
    }

    @Post(':id/return')
    returnOrder(@Param('id') id: string, @Body('note') note?: string) {
        return this.salesService.returnOrder(id, note);
    }
}
