import { IsArray, IsOptional, IsString, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseItemDto {
    @IsString()
    productId: string;

    @IsNumber()
    @Min(1)
    quantity: number;

    @IsNumber()
    @Min(0)
    unitCost: number;
}

export class CreatePurchaseDto {
    @IsString()
    supplierId: string;

    @IsOptional()
    @IsString()
    warehouseId?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PurchaseItemDto)
    items: PurchaseItemDto[];

    @IsOptional()
    @IsString()
    note?: string;
}
