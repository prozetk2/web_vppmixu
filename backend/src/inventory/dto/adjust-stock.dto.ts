import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum MovementType {
    IMPORT = 'IMPORT',
    EXPORT = 'EXPORT',
    ADJUST = 'ADJUST',
}

export class AdjustStockDto {
    @IsString()
    warehouseId!: string;

    @IsString()
    productId!: string;

    @IsInt()
    @Min(1)
    quantity!: number;

    @IsEnum(MovementType)
    type!: MovementType;

    @IsOptional()
    @IsString()
    note?: string;

    @IsOptional()
    @IsString()
    storeId?: string;

    @IsOptional()
    @Type(() => Number)
    unitCost?: number;
}

