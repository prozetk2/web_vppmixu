# Backend (NestJS + Prisma + JWT)

## Yêu cầu
- Node.js >= 18, npm (nếu chạy không dùng Docker)
- Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- Postgres (Compose đã kèm db nội bộ)

## Chuẩn bị môi trường
1) Sao chép env: `cp .env.example .env`
2) Điền các biến:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`
   - `DATABASE_URL`, `DIRECT_URL` (dùng Supabase hoặc Postgres riêng)
   - `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT` (mặc định 3000)

## Chạy bằng Docker Compose
Trong thư mục `backend`:
```bash
# build + chạy (khuyến nghị khi đổi Dockerfile)
docker compose up --build

# hoặc dùng script npm tương đương
npm run docker:dev          # docker compose -f docker-compose.yml up
npm run docker:dev:rebuild  # docker compose -f docker-compose.yml up --build --remove-orphans

# dừng container
docker compose down
```
Mặc định map cổng: API `http://localhost:3000`, Postgres `localhost:5432`.
Container `api` sẽ chạy `prisma migrate deploy` trước khi start và yêu cầu đủ biến Supabase.

## Chạy local (không Docker)
```bash
npm install
npm run prisma:generate
npm run start:dev
```

## Lệnh tiện dụng
- Prisma client: `npm run prisma:generate`
- Migrate dev: `npm run prisma:migrate -- --name init`
- Deploy migrate (prod/container): `npm run prisma:migrate:deploy`
- Seed admin: `npm run seed:admin`

## Curl kiểm tra nhanh API
Giả sử server chạy tại `http://localhost:3000`.

```bash
# 1) Healthcheck
curl -i http://localhost:3000/health

# 2) Đăng nhập (lấy token)
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# 3) Lấy thông tin user hiện tại (thay <TOKEN> bằng access token nhận ở bước 2)
curl -i http://localhost:3000/auth/me \
  -H "Authorization: Bearer <TOKEN>"

# 4) Tạo sản phẩm mới (cần token)
curl -i -X POST http://localhost:3000/products \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Bút bi","barcode":"BB001","price":5000,"categoryId":1}'

# 5) Liệt kê sản phẩm
curl -i http://localhost:3000/products
```
