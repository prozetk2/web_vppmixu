import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseIntPipe,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
    constructor(private readonly invoicesService: InvoicesService) { }

    @Get()
    findAll(@Query() query: InvoiceQueryDto) {
        return this.invoicesService.findAll(query);
    }

    @Get('filter-options')
    getFilterOptions() {
        return this.invoicesService.getFilterOptions();
    }

    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
        console.log('Finding invoice with id:', id);
        try {
            const result = await this.invoicesService.findOne(id);
            console.log('Found invoice:', result?.invoiceNumber);
            return result;
        } catch (error: any) {
            console.error('FindOne error:', error.message, error.stack);
            throw error;
        }
    }

    @Post()
    create(@Body() createInvoiceDto: CreateInvoiceDto) {
        return this.invoicesService.create(createInvoiceDto);
    }

    @Post('bulk')
    async bulkCreate(@Body() dtos: CreateInvoiceDto[]) {
        console.log('Received bulk create request with', dtos?.length, 'invoices');
        console.log('First invoice data:', JSON.stringify(dtos?.[0], null, 2));
        try {
            const result = await this.invoicesService.bulkCreate(dtos);
            console.log('Bulk create result:', result);
            return result;
        } catch (error: any) {
            console.error('Bulk create error:', error.message, error.stack);
            throw error;
        }
    }

    @Put(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateInvoiceDto: UpdateInvoiceDto,
    ) {
        return this.invoicesService.update(id, updateInvoiceDto);
    }

    @Delete(':id')
    delete(@Param('id', ParseIntPipe) id: number) {
        return this.invoicesService.delete(id);
    }
}
