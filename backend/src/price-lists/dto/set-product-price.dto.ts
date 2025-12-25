import { IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class SetProductPriceDto {
    @IsString()
    productId: string;

    @IsString()
    priceListId: string;

    @IsNumber()
    @Type(() => Number)
    price: number;
}
