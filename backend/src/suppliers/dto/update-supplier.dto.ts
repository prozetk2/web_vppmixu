import { IsEmail, IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

const emptyStringToUndefined = ({ value }: { value: any }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value;

export class UpdateSupplierDto {
    @IsOptional()
    @Transform(emptyStringToUndefined)
    @IsString()
    code?: string;

    @IsOptional()
    @Transform(emptyStringToUndefined)
    @IsString()
    name?: string;

    @IsOptional()
    @Transform(emptyStringToUndefined)
    @IsEmail()
    email?: string;

    @IsOptional()
    @Transform(emptyStringToUndefined)
    @IsString()
    phone?: string;

    @IsOptional()
    @Transform(emptyStringToUndefined)
    @IsString()
    address?: string;

    @IsOptional()
    @Transform(emptyStringToUndefined)
    @IsString()
    taxNumber?: string;

    // Thông tin từ Excel
    @IsOptional()
    @Transform(emptyStringToUndefined)
    @IsString()
    area?: string;

    @IsOptional()
    @Transform(emptyStringToUndefined)
    @IsString()
    ward?: string;

    @IsOptional()
    @Transform(emptyStringToUndefined)
    @IsString()
    notes?: string;

    @IsOptional()
    @Transform(emptyStringToUndefined)
    @IsString()
    supplierGroup?: string;

    @IsOptional()
    @Transform(emptyStringToUndefined)
    @IsString()
    company?: string;

    @IsOptional()
    @Transform(emptyStringToUndefined)
    @IsString()
    creator?: string;

    // Thống kê tài chính
    @IsOptional()
    @Transform(({ value }) => value ? parseFloat(value) : undefined)
    @IsNumber()
    totalPurchase?: number;

    @IsOptional()
    @Transform(({ value }) => value ? parseFloat(value) : undefined)
    @IsNumber()
    currentDebt?: number;

    @IsOptional()
    @Transform(({ value }) => value ? parseFloat(value) : undefined)
    @IsNumber()
    totalPurchaseAfterReturn?: number;

    // Trạng thái
    @IsOptional()
    @IsBoolean()
    active?: boolean;
}

