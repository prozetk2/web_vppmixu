import { IsOptional, IsString } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  symbol?: string;
}
