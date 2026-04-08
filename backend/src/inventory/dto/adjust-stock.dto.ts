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

    @Type(() => Number)
    @Min(0.001) // Allow decimal quantities > 0
    quantity!: number;

    @IsEnum(MovementType)
    type!: MovementType;

    @IsOptional()
    @IsString()
    note?: string;

    @IsOptional()
    @IsString()
    reference?: string;

    @IsOptional()
    @IsString()
    storeId?: string;

    @IsOptional()
    @IsString()
    unit?: string;

    @IsOptional()
    @Type(() => Number)
    displayQuantity?: number;

    @IsOptional()
    @IsString()
    displayUnit?: string;

    @IsOptional()
    @IsString()
    referenceType?: string;

    @IsOptional()
    @IsString()
    referenceId?: string;

    @IsOptional()
    @IsString()
    referenceCode?: string;

    @IsOptional()
    @Type(() => Number)
    unitCost?: number;
}

