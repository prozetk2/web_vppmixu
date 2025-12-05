# Hướng Dẫn Seed Data từ Excel

## Mục đích
Script này giúp import dữ liệu từ file Excel vào database Supabase thông qua Prisma ORM.

## Cấu trúc File Excel (data.xlsx)

File Excel cần được đặt ở thư mục gốc của project (cùng cấp với thư mục `backend` và `frontend`).

### Các Sheet cần có trong Excel:

#### 1. **roles** (Sheet cho vai trò người dùng)
Các cột:
- `code` (bắt buộc): Mã vai trò (unique)
- `name`: Tên vai trò
- `description`: Mô tả vai trò

Ví dụ:
```
code    | name          | description
--------|---------------|------------------
ADMIN   | Administrator | Quản trị viên hệ thống
STAFF   | Staff         | Nhân viên
MANAGER | Manager       | Quản lý
```

#### 2. **users** (Sheet cho người dùng)
Các cột:
- `username` (bắt buộc): Tên đăng nhập (unique)
- `email`: Email
- `password`: Mật khẩu (sẽ được hash, mặc định: 123456)
- `full_name` hoặc `fullName`: Họ tên
- `phone`: Số điện thoại
- `enabled`: Trạng thái (true/false, mặc định: true)

#### 3. **user_roles** hoặc **UserRoles** (Phân quyền)
Các cột:
- `username`: Tên đăng nhập của user
- `role_code` hoặc `roleCode`: Mã vai trò

#### 4. **stores** hoặc **Stores** (Cửa hàng)
Các cột:
- `code` (bắt buộc): Mã cửa hàng (unique)
- `name` (bắt buộc): Tên cửa hàng
- `address`: Địa chỉ
- `tax_number` hoặc `taxNumber`: Mã số thuế
- `phone`: Số điện thoại
- `email`: Email
- `settings`: JSON settings (dạng string)

#### 5. **categories** hoặc **Categories** (Danh mục sản phẩm)
Các cột:
- `code` (bắt buộc): Mã danh mục (unique)
- `name` (bắt buộc): Tên danh mục
- `description`: Mô tả
- `parent_code` hoặc `parentCode`: Mã danh mục cha (để tạo cây danh mục)

#### 6. **customers** hoặc **Customers** (Khách hàng)
Các cột:
- `code` (bắt buộc): Mã khách hàng (unique)
- `name` (bắt buộc): Tên khách hàng
- `email`: Email
- `phone`: Số điện thoại
- `address`: Địa chỉ
- `tax_number` hoặc `taxNumber`: Mã số thuế

#### 7. **suppliers** hoặc **Suppliers** (Nhà cung cấp)
Các cột tương tự như customers

#### 8. **warehouses** hoặc **Warehouses** (Kho)
Các cột:
- `code`: Mã kho
- `name` (bắt buộc): Tên kho
- `address`: Địa chỉ
- `store_code`: Mã cửa hàng (liên kết với stores)

#### 9. **chart_of_accounts** hoặc **ChartOfAccounts** (Hệ thống tài khoản kế toán)
Các cột:
- `code` (bắt buộc): Mã tài khoản (unique)
- `name` (bắt buộc): Tên tài khoản
- `type`: Loại tài khoản
- `parent_code` hoặc `parentCode`: Mã tài khoản cha

#### 10. **bank_accounts** hoặc **BankAccounts** (Tài khoản ngân hàng)
Các cột:
- `store_code`: Mã cửa hàng
- `bank_name` hoặc `bankName`: Tên ngân hàng
- `account_number` hoặc `accountNumber`: Số tài khoản
- `currency`: Đơn vị tiền tệ (mặc định: VND)

#### 11. **products** hoặc **Products** (Sản phẩm)
Các cột:
- `sku` (bắt buộc): Mã sản phẩm (unique)
- `name` (bắt buộc): Tên sản phẩm
- `description`: Mô tả
- `category_code`: Mã danh mục
- `default_price` hoặc `defaultPrice`: Giá bán mặc định
- `default_cost` hoặc `defaultCost`: Giá vốn mặc định

#### 12. **product_variants** hoặc **ProductVariants** (Biến thể sản phẩm)
Các cột:
- `product_sku` hoặc `productSku`: Mã sản phẩm cha
- `sku`: Mã biến thể
- `barcode`: Mã vạch
- `attributes`: Thuộc tính (JSON string, ví dụ: {"size":"L","color":"red"})
- `price`: Giá bán
- `cost`: Giá vốn
- `active`: Trạng thái (true/false)

#### 13. **inventory** hoặc **Inventory** (Tồn kho)
Các cột:
- `variant_sku` hoặc `variantSku`: Mã biến thể sản phẩm
- `warehouse_code` hoặc `warehouseCode`: Mã kho
- `quantity`: Số lượng tồn
- `reserved`: Số lượng đã đặt trước

## Cách chạy

### Bước 1: Chuẩn bị
1. Đảm bảo file `data.xlsx` đã được đặt ở thư mục gốc của project
2. Cấu hình database connection trong file `.env`:
```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

### Bước 2: Migrate database schema
```bash
cd backend
npm run prisma:generate
npm run prisma:migrate:deploy
```

### Bước 3: Chạy seed data
```bash
npm run seed:data
```

## Lưu ý quan trọng

### Thứ tự import
Script sẽ tự động import data theo đúng thứ tự phụ thuộc:
1. Roles, Stores, Categories, Customers, Suppliers, Chart of Accounts
2. Users
3. User Roles
4. Warehouses, Bank Accounts
5. Products
6. Product Variants
7. Inventory

### Xử lý lỗi
- Nếu một bản ghi đã tồn tại (dựa trên unique field), nó sẽ được cập nhật thay vì tạo mới
- Các sheet không tồn tại trong Excel sẽ bị bỏ qua
- Script sẽ hiển thị log chi tiết về quá trình import

### Định dạng dữ liệu
- **Boolean**: Sử dụng `TRUE`/`FALSE` hoặc `1`/`0` trong Excel
- **Number**: Nhập trực tiếp số, không có ký tự đặc biệt
- **JSON**: Nhập dạng string hợp lệ JSON (ví dụ: `{"key":"value"}`)
- **Date**: Sử dụng định dạng date của Excel

### Ví dụ file Excel mẫu

#### Sheet: roles
| code | name | description |
|------|------|-------------|
| ADMIN | Administrator | Full system access |
| STAFF | Staff | Basic access |

#### Sheet: users
| username | email | password | full_name | phone | enabled |
|----------|-------|----------|-----------|-------|---------|
| admin | admin@example.com | admin123 | Admin User | 0901234567 | TRUE |
| staff1 | staff1@example.com | staff123 | Staff One | 0901234568 | TRUE |

#### Sheet: products
| sku | name | description | category_code | default_price | default_cost |
|-----|------|-------------|---------------|---------------|--------------|
| PROD001 | Product 1 | Description 1 | CAT001 | 100000 | 80000 |
| PROD002 | Product 2 | Description 2 | CAT001 | 200000 | 150000 |

## Troubleshooting

### Lỗi: "Cannot find module"
```bash
npm install
npm run prisma:generate
```

### Lỗi: "Database connection failed"
- Kiểm tra lại cấu hình DATABASE_URL trong .env
- Đảm bảo database server đang chạy
- Kiểm tra firewall và network connectivity

### Lỗi: "Foreign key constraint failed"
- Kiểm tra dữ liệu reference (ví dụ: category_code phải tồn tại trong sheet categories)
- Đảm bảo các sheet được điền đầy đủ theo thứ tự phụ thuộc

### Lỗi khi đọc file Excel
- Đảm bảo file data.xlsx ở đúng vị trí (thư mục gốc project)
- Kiểm tra tên các sheet trong Excel (phân biệt hoa thường)
- Đảm bảo file không bị mở bởi ứng dụng khác

## Mở rộng

Nếu cần thêm các bảng khác, bạn có thể:
1. Thêm sheet mới trong Excel
2. Tạo function seed tương ứng trong `seed-data.ts`
3. Gọi function trong hàm `main()` theo đúng thứ tự phụ thuộc
