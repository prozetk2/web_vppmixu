import { IsEmail, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class CreateCustomerDto {
    @IsOptional()
    @IsString()
    code?: string;

    @IsNotEmpty()
    @IsString()
    name!: string;

    @IsOptional()
    @ValidateIf((o) => o.email && o.email.length > 0)
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    taxNumber?: string;
}
