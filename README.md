# web_vppmixu

## Backend (NestJS + Prisma + Supabase)
- Cấu hình sẵn ValidationPipe, HttpExceptionFilter (response chuẩn `{ data | error }`), ResponseInterceptor.
- Modules: Auth (JWT, bcrypt, @Roles), Products, Categories, Units, PrismaService.
- Prisma schema: `backend/prisma/schema.prisma` (User/Role, Product/Category/Unit, soft delete).
- API contract nháp: `docs/api-contract.md` (Auth, Product/Category/Unit).
- Seed admin: `npm run seed:admin` (admin@example.com / admin123).

### Chạy local
```bash
cd backend
cp .env.example .env  # điền DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, PORT
npm install
npm run prisma:generate
# nếu có DB: npm run prisma:migrate -- --name init
npm run start:dev
```

### Docker / Compose
- Build backend: `docker build -t web-vpp-backend ./backend`
- Compose API + Postgres: `docker compose up --build`
  - DATABASE_URL mặc định: `postgresql://app:app@db:5432/appdb?schema=public`
  - Seed admin (sau khi up): `docker compose exec api npm run seed:admin`

### Test
- Unit: `cd backend && npm test`
- E2E (cần DB riêng): `npm run test:e2e`
- Với compose: `docker compose run --rm api npm test`

### Biến môi trường chính (backend/.env.example)
- `DATABASE_URL` (team data cung cấp)
- `JWT_SECRET` (tự sinh: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `JWT_EXPIRES_IN` (mặc định 1d)
- `PORT` (mặc định 3000)
