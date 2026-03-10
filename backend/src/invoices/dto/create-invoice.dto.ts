import { IsOptional, IsString, IsNumber, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateInvoiceItemDto {
    @IsOptional()
    @IsString()
    productCode?: string;

    @IsOptional()
    @IsString()
    barcode?: string;

    @IsOptional()
    @IsString()
    productName?: string;

    @IsOptional()
    @IsString()
    brand?: string;

    @IsOptional()
    @IsString()
    unit?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseFloat(value) || 0)
    quantity?: number;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseFloat(value) || 0)
    unitPrice?: number;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseFloat(value) || 0)
    discountPercent?: number;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseFloat(value) || 0)
    discountAmount?: number;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseFloat(value) || 0)
    salePrice?: number;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseFloat(value) || 0)
    totalPrice?: number;
}

export class CreateInvoiceDto {
    @IsOptional()
    @IsString()
    invoiceNumber?: string;

    @IsOptional()
    @IsString()
    branch?: string;

    @IsOptional()
    @IsString()
    orderCode?: string;

    @IsOptional()
    @IsString()
    returnOrderCode?: string;

    @IsOptional()
    @IsString()
    customerCode?: string;

    @IsOptional()
    @IsString()
    customerName?: string;

    @IsOptional()
    @IsString()
    customerEmail?: string;

    @IsOptional()
    @IsString()
    customerPhone?: string;

    @IsOptional()
    @IsString()
    customerAddress?: string;

    @IsOptional()
    @IsString()
    customerArea?: string;

    @IsOptional()
    @IsString()
    customerWard?: string;

    @IsOptional()
    @IsString()
    customerDob?: string;

    @IsOptional()
    @IsString()
    priceList?: string;

    @IsOptional()
    @IsString()
    seller?: string;

    @IsOptional()
    @IsString()
    salesChannel?: string;

    @IsOptional()
    @IsString()
    creator?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseFloat(value) || 0)
    totalAmount?: number;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseFloat(value) || 0)
    discountAmount?: number;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseFloat(value) || 0)
    amountDue?: number;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseFloat(value) || 0)
    amountPaid?: number;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseFloat(value) || 0)
    cashAmount?: number;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseFloat(value) || 0)
    cardAmount?: number;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseFloat(value) || 0)
    walletAmount?: number;

    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => parseFloat(value) || 0)
    transferAmount?: number;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    eInvoiceStatus?: string;

    @IsOptional()
    @IsString()
    paymentMethod?: string;

    @IsOptional()
    @IsString()
    issuedAt?: string;

    @IsOptional()
    @IsString()
    storeId?: string; // Company/Store for this invoice (for reporting)

    @IsOptional()
    @IsString()
    createdAt?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateInvoiceItemDto)
    items?: CreateInvoiceItemDto[];
}
