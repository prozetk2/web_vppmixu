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

  @Transform(({ value }) => value === true || value === 'true')
  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean;
}
