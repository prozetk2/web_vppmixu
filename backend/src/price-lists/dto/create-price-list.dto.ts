import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreatePriceListDto {
    @IsString()
    name: string;

    @IsString()
    code: string;

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
