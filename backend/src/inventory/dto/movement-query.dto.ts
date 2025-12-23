import { IsOptional, IsString, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class MovementQueryDto {
    @IsOptional()
    @IsString()
    warehouseId?: string;

    @IsOptional()
    @IsString()
    productId?: string;

    @IsOptional()
    @IsString()
    type?: string; // IMPORT, EXPORT, ADJUST

    @IsOptional()
    @IsString()
    storeId?: string;

    @IsOptional()
    @IsDateString()
    fromDate?: string;

    @IsOptional()
    @IsDateString()
    toDate?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 20;
}
