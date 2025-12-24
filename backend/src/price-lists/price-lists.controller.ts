import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { PriceListsService } from './price-lists.service';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { SetProductPriceDto } from './dto/set-product-price.dto';

@Controller('price-lists')
export class PriceListsController {
    constructor(private readonly priceListsService: PriceListsService) { }

    @Get()
    findAll() {
        return this.priceListsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.priceListsService.findOne(id);
    }

    @Post()
    create(@Body() dto: CreatePriceListDto) {
        return this.priceListsService.create(dto);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: UpdatePriceListDto) {
        return this.priceListsService.update(id, dto);
    }

    @Delete(':id')
    delete(@Param('id') id: string) {
        return this.priceListsService.delete(id);
    }

    // Product price endpoints
    @Post('product-price')
    setProductPrice(@Body() dto: SetProductPriceDto) {
        return this.priceListsService.setProductPrice(dto);
    }

    @Get(':id/products')
    getProductPrices(@Param('id') id: string) {
        return this.priceListsService.getProductPrices(id);
    }

    @Post(':id/bulk-prices')
    bulkSetPrices(
        @Param('id') id: string,
        @Body() body: { prices: Array<{ productId: string; price: number }> }
    ) {
        return this.priceListsService.bulkSetPrices(id, body.prices);
    }
}
