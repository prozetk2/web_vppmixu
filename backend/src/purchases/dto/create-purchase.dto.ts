import { IsArray, IsOptional, IsString, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseItemDto {
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

    @IsOptional()
    @IsNumber()
    @Min(0)
    displayQuantity?: number;
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

    @IsOptional()
    @IsNumber()
    @Min(0)
    prepaymentAmount?: number;

    @IsOptional()
    @IsString()
    paymentMethod?: string; // CASH, TRANSFER, etc.

    @IsOptional()
    @IsString()
    createdAt?: string;
}
