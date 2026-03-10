import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MovementType } from './adjust-stock.dto';

export class BulkAdjustItemDto {
    @IsString()
    productCode!: string;

    @IsOptional()
    @IsString()
    productName?: string;

    @IsString()
    warehouseId!: string;

    @IsInt()
    @Min(0)
    quantity!: number;

    @IsEnum(MovementType)
    type!: MovementType;

    @IsOptional()
    @IsString()
    note?: string;

    @IsOptional()
    @Type(() => Number)
    unitCost?: number;

    @IsOptional()
    @IsString()
    storeId?: string;

    @IsOptional()
    @IsString()
    unit?: string;
}

export class BulkAdjustStockDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BulkAdjustItemDto)
    items!: BulkAdjustItemDto[];
}
