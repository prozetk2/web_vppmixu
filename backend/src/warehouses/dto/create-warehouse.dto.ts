import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWarehouseDto {
    @IsNotEmpty()
    @IsString()
    name!: string;

    @IsOptional()
    @IsString()
    code?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    manager?: string; // Người quản lý

    @IsOptional()
    @IsBoolean()
    active?: boolean; // Trạng thái hoạt động

    @IsOptional()
    @IsString()
    notes?: string; // Ghi chú

    @IsOptional()
    @IsString()
    storeId?: string;
}
