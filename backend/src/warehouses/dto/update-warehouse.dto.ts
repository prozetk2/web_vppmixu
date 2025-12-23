import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateWarehouseDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    code?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    manager?: string;

    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsString()
    storeId?: string;
}
