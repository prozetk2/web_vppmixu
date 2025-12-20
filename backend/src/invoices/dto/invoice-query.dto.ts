import { IsOptional, IsString, IsNumberString } from 'class-validator';
import { Transform } from 'class-transformer';

export class InvoiceQueryDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    dateFrom?: string;

    @IsOptional()
    @IsString()
    dateTo?: string;

    @IsOptional()
    @IsString()
    status?: string; // COMPLETED, CANCELLED

    @IsOptional()
    @IsString()
    eInvoiceStatus?: string;

    @IsOptional()
    @IsString()
    paymentMethod?: string;

    @IsOptional()
    @IsString()
    creator?: string;

    @IsOptional()
    @IsString()
    seller?: string;

    @IsOptional()
    @IsString()
    priceList?: string;

    @IsOptional()
    @IsString()
    salesChannel?: string;

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
