import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDebtAdjustmentDto {
    @IsIn(['ADJUSTMENT', 'DISCOUNT'])
    type: string;

    @Type(() => Number)
    @IsNumber()
    amount: number;

    @IsOptional()
    @IsString()
    executor?: string;

    @IsOptional()
    @IsString()
    note?: string;

    @IsOptional()
    @IsString()
    createdAt?: string;
}

