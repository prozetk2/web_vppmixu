import { IsOptional, IsString, IsNumberString } from 'class-validator';
import { Transform } from 'class-transformer';

export class SupplierQueryDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsNumberString()
    totalPurchaseFrom?: string;

    @IsOptional()
    @IsNumberString()
    totalPurchaseTo?: string;

    @IsOptional()
    @IsNumberString()
    currentDebtFrom?: string;

    @IsOptional()
    @IsNumberString()
    currentDebtTo?: string;

    @IsOptional()
    @IsString()
    dateFrom?: string;

    @IsOptional()
    @IsString()
    dateTo?: string;

    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10) || 1)
    page?: number = 1;

    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10) || 20)
    limit?: number = 20;

    @IsOptional()
    @IsString()
    sortBy?: string = 'createdAt';

    @IsOptional()
    @IsString()
    sortOrder?: 'asc' | 'desc' = 'desc';
}
