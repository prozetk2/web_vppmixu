import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { BulkImportProductsDto } from './dto/bulk-import.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  // TEST endpoint without any guards
  @Post('test-bulk')
  async testBulk(@Body() body: any) {
    console.log('=== TEST BULK ENDPOINT ===');
    console.log('Body received:', typeof body, Object.keys(body || {}));
    console.log('Items count:', body?.items?.length);
    return { success: true, itemsReceived: body?.items?.length || 0 };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('export')
  async export() {
    const data = await this.productsService.export();
    return { data };
  }

  // Bulk import - temporarily without role check for testing
  @UseGuards(JwtAuthGuard)
  @Post('bulk')
  async bulkImport(@Body() dto: BulkImportProductsDto) {
    console.log('=== BULK IMPORT REQUEST ===');
    console.log('Items count:', dto.items?.length);
    if (dto.items?.[0]) {
      console.log('First item:', JSON.stringify(dto.items[0]));
    }
    try {
      const result = await this.productsService.bulkImport(dto);
      console.log('Bulk import result:', result.created, 'created,', result.updated, 'updated,', result.failed, 'failed');
      return { data: result };
    } catch (error: any) {
      console.error('Bulk import error:', error.message, error.stack);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ACCOUNTANT')
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ACCOUNTANT')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ACCOUNTANT')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
