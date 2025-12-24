import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdatePriceListDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;

    @IsOptional()
    @IsBoolean()
    active?: boolean;
}
