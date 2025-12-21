import { IsArray, IsOptional, IsString } from 'class-validator';

// Simple DTO without nested validation - much faster for large imports
export class BulkImportProductsDto {
    @IsArray()
    items!: any[]; // Accept any array shape, validate in service

    @IsOptional()
    @IsString()
    warehouseId?: string;
}
