import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum PurchaseStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    CANCELLED = 'CANCELLED',
}

export class PurchaseQueryDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    supplierId?: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsDateString()
    fromDate?: string;

    @IsOptional()
    @IsDateString()
    toDate?: string;

    @IsOptional()
    @Type(() => Number)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    limit?: number = 20;
}
