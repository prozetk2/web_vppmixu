import { IsArray, IsOptional, IsString, ValidateNested, IsNumber, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
    @IsString()
    productId: string;

    @IsNumber()
    @Min(1)
    quantity: number;

    @IsOptional()
    @IsNumber()
    unitPrice?: number;

    @IsOptional()
    @IsNumber()
    discount?: number;
}

export enum PaymentMethod {
    CASH = 'CASH',
    TRANSFER = 'TRANSFER',
    CARD = 'CARD',
}

export class PaymentDto {
    @IsNumber()
    @Min(0)
    amount: number;

    @IsOptional()
    @IsEnum(PaymentMethod)
    method?: PaymentMethod = PaymentMethod.CASH;

    @IsOptional()
    @IsString()
    reference?: string;
}

export class CreateOrderDto {
    @IsOptional()
    @IsString()
    customerId?: string;

    @IsOptional()
    @IsString()
    warehouseId?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    @IsOptional()
    @ValidateNested()
    @Type(() => PaymentDto)
    payment?: PaymentDto;

    @IsOptional()
    @IsNumber()
    discountAmount?: number;

    @IsOptional()
    @IsString()
    note?: string;

    @IsOptional()
    @IsString()
    storeId?: string; // Company/Store for this sale (for reporting)
}
