import { IsArray, IsOptional, IsString, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePurchaseItemDto {
    @IsString()
    productId: string;

    @IsNumber()
    @Min(1)
    quantity: number;

    @IsString()
    @IsOptional()
    unit?: string;

    @IsNumber()
    @Min(0)
    unitCost: number;
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
    @IsString()
    createdAt?: string;
}
