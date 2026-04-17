import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class CustomerPaymentAllocationDto {
    @IsString()
    invoiceId: string;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    amount: number;
}

export class CreateCustomerPaymentDto {
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    amount: number;

    @IsOptional()
    @IsString()
    paymentMethod?: string;

    @IsOptional()
    @IsString()
    collector?: string;

    @IsOptional()
    @IsString()
    note?: string;

    @IsOptional()
    @IsBoolean()
    allocateToInvoices?: boolean;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CustomerPaymentAllocationDto)
    allocations?: CustomerPaymentAllocationDto[];

    @IsOptional()
    @IsString()
    createdAt?: string;
}
