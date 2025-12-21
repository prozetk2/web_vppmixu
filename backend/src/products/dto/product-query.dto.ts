import { Transform } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ProductQueryDto {
  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsNumber()
  @Min(1)
  page = 1;

  @Transform(({ value }) => (value ? Number(value) : 20))
  @IsNumber()
  @Min(1)
  limit = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  productType?: string; // GOODS, SERVICE, COMBO

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  directSale?: boolean;

  @IsOptional()
  @IsString()
  stockFilter?: string; // 'low', 'out', 'all'

  @IsOptional()
  @IsString()
  sortBy?: string; // 'name', 'sku', 'price', 'createdAt'

  @IsOptional()
  @IsString()
  sortOrder?: string; // 'asc', 'desc'
}
