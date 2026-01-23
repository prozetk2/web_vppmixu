import { IsOptional, IsNumber, IsString, IsBoolean } from 'class-validator';

export class UpdateSettingsDto {
    @IsOptional()
    @IsString()
    companyName?: string;

    @IsOptional()
    @IsString()
    companyAddress?: string;

    @IsOptional()
    @IsString()
    companyPhone?: string;

    @IsOptional()
    @IsString()
    companyEmail?: string;

    @IsOptional()
    @IsString()
    taxNumber?: string;

    @IsOptional()
    @IsNumber()
    taxRate?: number;

    @IsOptional()
    @IsString()
    invoicePrefix?: string;

    @IsOptional()
    @IsNumber()
    lowStockThreshold?: number;

    @IsOptional()
    @IsBoolean()
    autoPrintInvoice?: boolean;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsString()
    logo?: string;

    @IsOptional()
    @IsString()
    companyWebsite?: string;
}
