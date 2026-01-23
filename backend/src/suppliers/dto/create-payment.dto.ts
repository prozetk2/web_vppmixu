import { IsNumber, IsString, IsOptional, Min, IsArray, IsBoolean } from 'class-validator';

export class CreatePaymentDto {
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
    allocations?: {
        purchaseOrderId: string;
        amount: number;
    }[];
}
