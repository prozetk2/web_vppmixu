# Migration: Change Quantity from BigInt to Decimal

## Lý do thay đổi
- Cho phép nhập số thập phân (0.5, 1.5, 2.3, etc.) cho số lượng
- Linh hoạt hơn cho các sản phẩm bán theo cân nặng (Kg, gram) hoặc thể tích (lít)
- Không cần quy đổi về số nguyên

## Các bảng bị ảnh thay đổi
1. `inventory` - quantity, reserved
2. `stock_movement` - quantity
3. `order_item` - quantity
4. `purchase_item` - quantity

## Cách chạy migration

### Development:
```bash
cd backend

# 1. Generate Prisma client mới
npx prisma generate

# 2. Tạo và chạy migration
npx prisma migrate dev --name change_quantity_to_decimal

# 3. Restart backend
# Nếu Docker:
docker compose restart api

# Nếu npm:
# Ctrl+C rồi
npm run start:dev
```

### Production:
```bash
cd backend

# 1. Backup database trước!
# pg_dump hoặc Supabase backup

# 2. Generate Prisma client
npx prisma generate

# 3. Deploy migration
npx prisma migrate deploy

# 4. Restart backend
docker compose restart api
```

## Lưu ý
- Migration sẽ tự động convert BigInt sang Decimal
- Dữ liệu cũ sẽ được giữ nguyên (1 → 1.000)
- Sau migration, có thể nhập số thập phân (0.5, 1.5, etc.)
- Precision: 15 digits, Scale: 3 decimal places (xxx,xxx,xxx,xxx.xxx)

## Rollback (nếu cần)
```bash
# Xem lịch sử migrations
npx prisma migrate status

# Rollback về migration trước
npx prisma migrate resolve --rolled-back <migration_name>
```
