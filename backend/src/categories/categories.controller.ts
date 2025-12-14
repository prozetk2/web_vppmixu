import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoriesService } from './categories.service';
import { ExcelService } from '../common/services/excel.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly excelService: ExcelService,
  ) { }

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Roles('ADMIN', 'ACCOUNTANT')
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Roles('ADMIN', 'ACCOUNTANT')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Roles('ADMIN', 'ACCOUNTANT')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }

  @Roles('ADMIN')
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importFromExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      // Parse Excel file
      const data = this.excelService.parseExcelFile(file.buffer);

      // Validate required fields
      const validation = this.excelService.validateRequiredFields(data, ['name', 'code']);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // Import categories
      const results = [];
      const errors = [];

      for (const row of data) {
        try {
          const category = await this.categoriesService.create({
            name: row.name,
            code: row.code,
            description: row.description || null,
            parentId: row.parentId || null,
          });
          results.push(category);
        } catch (error) {
          errors.push(`Row with code "${row.code}": ${error.message}`);
        }
      }

      return {
        success: true,
        imported: results.length,
        total: data.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to import: ${error.message}`);
    }
  }
}
