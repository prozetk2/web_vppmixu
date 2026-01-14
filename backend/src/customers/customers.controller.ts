import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
    constructor(private readonly customersService: CustomersService) { }

    @Post()
    @Roles('ADMIN', 'MANAGER', 'SALESPERSON')
    create(@Body() createCustomerDto: CreateCustomerDto) {
        return this.customersService.create(createCustomerDto);
    }

    @Get()
    findAll() {
        return this.customersService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.customersService.findOne(id);
    }

    @Put(':id')
    @Roles('ADMIN', 'MANAGER', 'SALESPERSON')
    update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
        return this.customersService.update(id, updateCustomerDto);
    }

    @Delete(':id')
    @Roles('ADMIN', 'MANAGER')
    remove(@Param('id') id: string) {
        return this.customersService.remove(id);
    }

    @Get(':id/orders')
    getOrders(@Param('id') id: string) {
        return this.customersService.getOrders(id);
    }

    @Get(':id/invoices')
    getInvoices(@Param('id') id: string) {
        return this.customersService.getInvoices(id);
    }

    @Get(':id/debts')
    getDebts(@Param('id') id: string, @Query('filter') filter?: string) {
        return this.customersService.getDebts(id, filter);
    }
}
