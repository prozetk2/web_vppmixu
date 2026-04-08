import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class PaymentAllocationDto {
    @IsString()
    purchaseOrderId: string;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    amount: number;
}

export class CreatePaymentDto {
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    amount: number;

    @IsString()
    paymentMethod: string; // 'cash', 'transfer', 'card'

    @IsString()
    @IsOptional()
    note?: string;

    @IsBoolean()
    @IsOptional()
    allocateToPurchases?: boolean;

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => PaymentAllocationDto)
    allocations?: PaymentAllocationDto[];

    @IsOptional()
    @IsString()
    createdAt?: string;
}
