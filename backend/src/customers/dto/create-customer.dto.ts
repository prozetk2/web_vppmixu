import { IsEmail, IsNotEmpty, IsOptional, IsString, IsNumber, ValidateIf, IsDecimal } from 'class-validator';

export class CreateCustomerDto {
    @IsOptional()
    @IsString()
    code?: string;

    // Tạm bỏ validation để test
    // @IsNotEmpty()
    @IsOptional()
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

    // Thông tin bổ sung
    @IsOptional()
    @IsString()
    contactPerson?: string;

    @IsOptional()
    @IsString()
    position?: string;

    @IsOptional()
    @IsString()
    fax?: string;

    @IsOptional()
    @IsString()
    website?: string;

    // Địa chỉ chi tiết
    @IsOptional()
    @IsString()
    street?: string;

    @IsOptional()
    @IsString()
    ward?: string;

    @IsOptional()
    @IsString()
    district?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    country?: string;

    @IsOptional()
    @IsString()
    postalCode?: string;

    // Thông tin ngân hàng
    @IsOptional()
    @IsString()
    bankName?: string;

    @IsOptional()
    @IsString()
    bankAccount?: string;

    @IsOptional()
    @IsString()
    bankBranch?: string;

    // Thông tin kinh doanh
    @IsOptional()
    @IsString()
    customerType?: string;

    @IsOptional()
    @IsString()
    industry?: string;

    @IsOptional()
    @IsString()
    companySize?: string;

    // Phân loại & Ghi chú
    @IsOptional()
    @IsString()
    customerGroup?: string;

    @IsOptional()
    @IsString()
    priority?: string;

    @IsOptional()
    @IsString()
    source?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    // Thông tin tài chính
    @IsOptional()
    @IsNumber()
    creditLimit?: number;

    @IsOptional()
    @IsString()
    paymentTerms?: string;

    // Thông tin từ Excel
    @IsOptional()
    @IsString()
    branch?: string;

    @IsOptional()
    @IsString()
    deliveryArea?: string;

    @IsOptional()
    @IsString()
    company?: string;

    @IsOptional()
    @IsString()
    idNumber?: string;

    @IsOptional()
    @IsString()
    birthDate?: string;

    @IsOptional()
    @IsString()
    gender?: string;

    @IsOptional()
    @IsString()
    facebook?: string;

    @IsOptional()
    @IsString()
    creator?: string;

    @IsOptional()
    @IsString()
    lastTransaction?: string;

    // Thống kê tài chính từ Excel
    @IsOptional()
    @IsNumber()
    debtDays?: number;

    @IsOptional()
    @IsNumber()
    currentDebt?: number;

    @IsOptional()
    @IsNumber()
    totalSales?: number;

    @IsOptional()
    @IsNumber()
    totalSalesAfterReturn?: number;
}
