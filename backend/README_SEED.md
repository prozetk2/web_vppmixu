# 🚀 Hướng Dẫn Seed Data từ Excel vào Supabase

## 📋 Tổng Quan

Hệ thống này cho phép bạn import dữ liệu hàng loạt từ file Excel vào database Supabase thông qua Prisma ORM. 

## 🔧 Yêu Cầu

- Node.js (v16 trở lên)
- npm hoặc yarn
- Database Supabase đã được setup
- File Excel (data.xlsx) với cấu trúc phù hợp

## 📝 Các Bước Thực Hiện

### Bước 1: Cấu hình môi trường

Tạo/cập nhật file `.env` trong thư mục `backend`:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"
```

### Bước 2: Chuẩn bị file Excel

1. Tạo file `data.xlsx` trong thư mục gốc của project (cùng cấp với `backend` và `frontend`)
2. Tham khảo cấu trúc trong file `EXCEL_TEMPLATE.md`
3. Tối thiểu nên có các sheet:
   - `roles`: Vai trò người dùng
   - `stores`: Cửa hàng
   - `categories`: Danh mục sản phẩm
   - `products`: Sản phẩm

### Bước 3: Kiểm tra file Excel (Optional nhưng khuyến nghị)

Trước khi import, nên validate file Excel:

```bash
cd backend
npm run validate:excel
```

Script này sẽ:
- ✓ Kiểm tra file có tồn tại không
- ✓ Liệt kê tất cả các sheet
- ✓ Kiểm tra cấu trúc các cột
- ✓ Hiển thị số lượng records
- ✓ Cảnh báo nếu thiếu cột quan trọng

### Bước 4: Generate Prisma Client và Migrate Database

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
```

### Bước 5: Chạy Seed Data

```bash
npm run seed:data
```

Script sẽ tự động:
1. Đọc file Excel
2. Import dữ liệu theo đúng thứ tự phụ thuộc
3. Tạo hoặc cập nhật records (dựa trên unique fields)
4. Hiển thị progress và kết quả

## 📊 Cấu Trúc Excel Chi Tiết

Xem file `EXCEL_TEMPLATE.md` để biết chi tiết về:
- Tên các sheet cần thiết
- Cấu trúc cột cho mỗi sheet
- Ví dụ dữ liệu mẫu
- Quy tắc format dữ liệu

## 🎯 Thứ Tự Import

Script tự động import theo thứ tự sau để đảm bảo foreign key constraints:

```
1. Independent tables (không phụ thuộc)
   ├── roles
   ├── stores
   ├── categories
   ├── customers
   ├── suppliers
   └── chart_of_accounts

2. Users
   └── users

3. User Relations
   └── user_roles (requires: users, roles)

4. Store Relations
   ├── warehouses (requires: stores)
   └── bank_accounts (requires: stores)

5. Products
   └── products (requires: categories)

6. Product Variants
   └── product_variants (requires: products)

7. Inventory
   └── inventory (requires: product_variants, warehouses)
```

## ⚙️ Scripts Có Sẵn

```bash
# Validate Excel file structure
npm run validate:excel

# Seed data from Excel
npm run seed:data

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate:deploy

# Seed admin user only
npm run seed:admin
```

## 🔍 Troubleshooting

### Lỗi: "Cannot find module xlsx"
```bash
cd backend
npm install xlsx
```

### Lỗi: "File not found: data.xlsx"
- Đảm bảo file `data.xlsx` nằm ở thư mục gốc của project
- Đường dẫn: `web_vppmixu/data.xlsx`
- Không phải: `web_vppmixu/backend/data.xlsx`

### Lỗi: "Foreign key constraint failed"
Nguyên nhân phổ biến:
- `category_code` trong sheet `products` không tồn tại trong sheet `categories`
- `product_sku` trong sheet `product_variants` không tồn tại trong sheet `products`
- `store_code` trong sheet `warehouses` không tồn tại trong sheet `stores`

Giải pháp: Kiểm tra lại dữ liệu reference giữa các sheet

### Lỗi: "Unique constraint failed"
Nguyên nhân:
- Có dữ liệu trùng lặp trong cột unique (code, sku, username, email...)

Giải pháp:
- Kiểm tra và loại bỏ dữ liệu trùng lặp trong Excel
- Hoặc xóa dữ liệu cũ trong database trước khi seed

### Lỗi: "Database connection timeout"
```bash
# Kiểm tra connection string
echo $DATABASE_URL

# Test connection với Prisma
npx prisma db push
```

### Dữ liệu không được import
1. Chạy validate để kiểm tra:
   ```bash
   npm run validate:excel
   ```

2. Kiểm tra log output khi chạy seed:
   ```bash
   npm run seed:data 2>&1 | tee seed.log
   ```

3. Kiểm tra tên sheet (case-sensitive trong một số trường hợp):
   - Sử dụng: `roles`, `users`, `products`
   - Hoặc: `Roles`, `Users`, `Products`
   - Script hỗ trợ cả hai

## 💡 Tips

### 1. Test với dữ liệu nhỏ trước
Bắt đầu với vài records để test:
- 2-3 roles
- 1-2 stores
- 5-10 products

### 2. Backup trước khi seed
```bash
# Backup database (nếu đã có dữ liệu)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### 3. Sử dụng Excel Formula
Trong Excel, bạn có thể dùng formula để tạo dữ liệu:
```excel
// Generate SKU codes
=CONCATENATE("PROD", TEXT(ROW()-1, "000"))

// Generate barcodes
=CONCATENATE("89", TEXT(RAND()*100000000, "00000000"))
```

### 4. Export từ hệ thống cũ
Nếu có dữ liệu từ hệ thống cũ:
1. Export sang CSV
2. Import CSV vào Excel
3. Chỉnh sửa tên cột cho khớp
4. Save as .xlsx

### 5. Xử lý JSON fields
Trong Excel, JSON cần là string:
```
// Đúng
{"size":"L","color":"Red"}

// Sai
{size:L,color:Red}
```

## 📚 Tài Liệu Tham Khảo

- `SEED_DATA_GUIDE.md` - Hướng dẫn chi tiết về seed script
- `EXCEL_TEMPLATE.md` - Template và ví dụ Excel
- `database.txt` - Cấu trúc database PostgreSQL
- `prisma/schema.prisma` - Prisma schema

## 🤝 Hỗ Trợ

Nếu gặp vấn đề:
1. Kiểm tra log output
2. Validate Excel file với `npm run validate:excel`
3. Kiểm tra database connection
4. Xem lại cấu trúc Excel trong EXCEL_TEMPLATE.md

## 📈 Mở Rộng

### Thêm bảng mới

1. Thêm sheet mới trong Excel
2. Tạo function seed trong `src/seed-data.ts`:
```typescript
async function seedYourTable(data: any[]) {
  if (!data || data.length === 0) return;
  
  console.log('Seeding your_table...');
  for (const item of data) {
    await prisma.yourTable.upsert({
      where: { uniqueField: item.unique_field },
      update: { /* fields */ },
      create: { /* fields */ },
    });
  }
  console.log(`✓ Seeded ${data.length} records`);
}
```

3. Gọi function trong `main()`:
```typescript
await seedYourTable(data['your_sheet'] || data['YourSheet']);
```

### Thêm validation

Sửa file `src/validate-excel.ts`:
```typescript
const SHEET_COLUMNS = {
  // ... existing
  your_table: ['col1', 'col2', 'col3'],
};
```

## ✅ Checklist Trước Khi Seed

- [ ] File data.xlsx đã sẵn sàng
- [ ] Đã chạy validate:excel và không có lỗi
- [ ] Database connection đã được test
- [ ] Đã backup dữ liệu hiện tại (nếu có)
- [ ] Đã review dữ liệu mẫu trong Excel
- [ ] Các unique fields (code, sku, username) không bị trùng

## 🎉 Hoàn Thành

Sau khi seed thành công:
1. Kiểm tra database với Prisma Studio:
   ```bash
   npx prisma studio
   ```

2. Hoặc query trực tiếp:
   ```bash
   npx prisma db seed
   ```

3. Test API endpoints để đảm bảo dữ liệu đã được import đúng

---

**Chúc bạn import dữ liệu thành công! 🚀**
