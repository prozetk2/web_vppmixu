import { IsArray, IsOptional, IsString, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePurchaseItemDto {
    @IsString()
    productId: string;

    @IsNumber()
    @Min(0.001)
    quantity: number;

    @IsString()
    @IsOptional()
    unit?: string;

    @IsNumber()
    @Min(0)
    unitCost: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    displayQuantity?: number;
}

export class UpdatePurchaseDto {
    @IsOptional()
    @IsString()
    supplierId?: string;

    @IsOptional()
    @IsString()
    warehouseId?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdatePurchaseItemDto)
    items?: UpdatePurchaseItemDto[];

    @IsOptional()
    @IsString()
    note?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    discountAmount?: number;

    @IsOptional()
    @IsString()
    createdAt?: string;
}
