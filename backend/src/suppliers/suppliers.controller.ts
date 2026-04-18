import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierQueryDto } from './dto/supplier-query.dto';
import { SuppliersService } from './suppliers.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateSupplierDebtAdjustmentDto } from './dto/create-debt-adjustment.dto';
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('suppliers')
export class SuppliersController {
    constructor(private readonly suppliersService: SuppliersService) { }

    @Post()
    @Roles('ADMIN', 'MANAGER', 'ACCOUNTANT')
    create(@Body() createSupplierDto: CreateSupplierDto) {
        return this.suppliersService.create(createSupplierDto);
    }

    @Get()
    findAll(@Query() query: SupplierQueryDto) {
        return this.suppliersService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.suppliersService.findOne(id);
    }

    @Post(':id/payments')
    payDebt(@Param('id') id: string, @Body() createPaymentDto: CreatePaymentDto) {
        return this.suppliersService.payDebt(id, createPaymentDto);
    }

    @Get(':id/payments')
    getPayments(@Param('id') id: string) {
        return this.suppliersService.getPayments(id);
    }

    @Delete(':id/payments/:paymentId')
    @Roles('ADMIN', 'MANAGER')
    deletePayment(@Param('id') id: string, @Param('paymentId') paymentId: string) {
        return this.suppliersService.deletePayment(id, paymentId);
    }

    @Post(':id/debt-adjustments')
    @Roles('ADMIN', 'MANAGER', 'ACCOUNTANT')
    createDebtAdjustment(@Param('id') id: string, @Body() dto: CreateSupplierDebtAdjustmentDto) {
        return this.suppliersService.createDebtAdjustment(id, dto);
    }

    @Put(':id')
    @Roles('ADMIN', 'MANAGER', 'ACCOUNTANT')
    update(@Param('id') id: string, @Body() updateSupplierDto: UpdateSupplierDto) {
        return this.suppliersService.update(id, updateSupplierDto);
    }

    @Delete(':id')
    @Roles('ADMIN', 'MANAGER')
    remove(@Param('id') id: string) {
        return this.suppliersService.remove(id);
    }
}
