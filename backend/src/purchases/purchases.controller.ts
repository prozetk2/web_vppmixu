import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { PurchaseQueryDto } from './dto/purchase-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('purchases')
@UseGuards(JwtAuthGuard)
export class PurchasesController {
    constructor(private readonly purchasesService: PurchasesService) { }

    @Post()
    create(@Body() dto: CreatePurchaseDto) {
        return this.purchasesService.create(dto);
    }

    @Get()
    findAll(@Query() query: PurchaseQueryDto) {
        return this.purchasesService.findAll(query);
    }

    @Get('export')
    exportToExcel(@Query() query: PurchaseQueryDto) {
        return this.purchasesService.exportToExcel(query);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.purchasesService.findOne(id);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: UpdatePurchaseDto) {
        return this.purchasesService.update(id, dto);
    }

    @Delete(':id')
    delete(@Param('id') id: string) {
        return this.purchasesService.delete(id);
    }

    @Post(':id/confirm')
    confirm(@Param('id') id: string) {
        return this.purchasesService.confirm(id);
    }

    @Post(':id/cancel')
    cancel(@Param('id') id: string) {
        return this.purchasesService.cancel(id);
    }
}
