import { IsOptional, IsDateString, IsString } from 'class-validator';

export class ReportQueryDto {
    @IsOptional()
    @IsDateString()
    fromDate?: string;

    @IsOptional()
    @IsDateString()
    toDate?: string;

    @IsOptional()
    @IsString()
    warehouseId?: string;

    @IsOptional()
    @IsString()
    storeId?: string;

    @IsOptional()
    @IsString()
    groupBy?: 'day' | 'week' | 'month' | 'year';
}
