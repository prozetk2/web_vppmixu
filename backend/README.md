# Backend (NestJS + Prisma + JWT)

## Yêu cầu
- Node.js >= 18, npm
- Supabase `DATABASE_URL` do team data cung cấp

## Thiết lập
1) Sao chép file env: `cp .env.example .env` và điền `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT` (mặc định 3000).
2) Cài đặt: `npm install`
3) Sinh Prisma Client: `npm run prisma:generate`
4) (Nếu được phép) migrate: `npm run prisma:migrate -- --name init`
5) Chạy dev: `npm run start:dev`

## Scripts chính
- `npm run start:dev`: chạy server watch mode
- `npm run lint`: eslint
- `npm run test` / `npm run test:e2e`: test
- `npm run prisma:generate` / `npm run prisma:migrate`
- `npm run prisma:migrate:deploy`: deploy migration khi chạy prod/container
- `npm run seed:admin`: seed tài khoản admin mặc định `admin@example.com / admin123`

## API hiện tại (đối chiếu docs/api-contract.md)
- Auth: `POST /auth/login` (email, password), `GET /auth/me` (Bearer JWT)
- Products: CRUD + list có search/pagination, soft delete, barcode unique
- Categories: CRUD + soft delete
- Units: CRUD

## Response chuẩn
- Success: `{ data, meta? }`
- Error: `{ error: { code, message, details? }, meta? }`

## Lưu ý
- Guard mặc định JWT + RBAC (@Roles) cho các mutation.
- Prisma schema đặt ở `prisma/schema.prisma` (role/user/product/category/unit). Team data có thể điều chỉnh thêm bảng/field khác.

## Docker
- Build image BE: `docker build -t web-vpp-backend ./backend`
- Compose (API + Postgres local): `docker compose up --build`
  - `DATABASE_URL` mặc định trong compose: `postgresql://app:app@db:5432/appdb?schema=public` (override qua env host).
  - Port: API `3000`, Postgres `5432`.
- Container `api` chạy `prisma migrate deploy` rồi start `dist/main`. Muốn seed admin: `docker compose exec api npm run seed:admin`.
