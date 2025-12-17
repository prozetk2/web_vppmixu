import { IsOptional, IsString, IsDateString } from 'class-validator';

export class DashboardQueryDto {
    @IsOptional()
    @IsDateString()
    fromDate?: string;

    @IsOptional()
    @IsDateString()
    toDate?: string;

    @IsOptional()
    @IsString()
    period?: 'day' | 'week' | 'month'; // default: day
}
