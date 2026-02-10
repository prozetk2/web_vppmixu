import { Transform } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  sku?: string; // Mã hàng

  @IsOptional()
  @IsString()
  barcode?: string; // Mã vạch

  @IsOptional()
  @IsString()
  categoryId?: string; // Nhóm hàng

  @IsOptional()
  @IsString()
  productType?: string; // Loại hàng: GOODS, SERVICE, COMBO

  @IsOptional()
  @IsString()
  brand?: string; // Thương hiệu

  @Transform(({ value }) => (value !== undefined ? Number(value) : 0))
  @IsNumber()
  @Min(0)
  price: number = 0; // Giá bán

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @Min(0)
  cost?: number; // Giá vốn

  @IsOptional()
  @IsString()
  unit?: string; // ĐVT

  @IsOptional()
  @IsString()
  baseUnitCode?: string; // Mã ĐVT cơ bản

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  conversionRate?: number; // Quy đổi

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @Min(0)
  minStock?: number; // Tồn nhỏ nhất

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @Min(0)
  maxStock?: number; // Tồn lớn nhất

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @Min(0)
  weight?: number; // Trọng lượng

  @IsOptional()
  @IsString()
  location?: string; // Vị trí

  @IsOptional()
  @IsString()
  images?: string; // Hình ảnh (url1,url2...)

  @IsOptional()
  attributes?: any; // Thuộc tính (JSON)

  @IsOptional()
  @IsString()
  relatedProductCodes?: string; // Mã HH liên quan

  @IsOptional()
  @IsString()
  noteTemplate?: string; // Mẫu ghi chú

  @IsOptional()
  componentProducts?: any; // Hàng thành phần (JSON)

  @IsOptional()
  @IsString()
  description?: string; // Mô tả

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  active?: boolean; // Đang kinh doanh

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  directSale?: boolean; // Được bán trực tiếp


  @IsOptional()
  @IsString()
  supplierId?: string; // Nhà cung cấp
}
