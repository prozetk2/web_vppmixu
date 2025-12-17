# Backend (NestJS + Prisma + Supabase + JWT)

## Yeu cau
- Node.js >= 18 + npm (neu chay khong dung Docker)
- Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- Postgres (docker-compose da kem db noi bo)

## Cai dat env
1) Sao chep env: `cp .env.example .env`
2) Dien cac bien:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`
   - `DATABASE_URL`, `DIRECT_URL` (dung Supabase hoac Postgres rieng)
   - `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT` (mac dinh 3000)
3) Dockerfile co ARG `DATABASE_URL`/`DIRECT_URL` mac dinh noi bo; co the override khi build neu muon.

## Chay bang Docker Compose (khuyen nghi)
Trong thu muc `backend`:
```bash
docker compose up --build

# hoac dung script npm tuong ung
npm run docker:dev          # docker compose -f docker-compose.yml up
npm run docker:dev:rebuild  # docker compose -f docker-compose.yml up --build --remove-orphans

# dung container
docker compose down
```
- Map cong: API `http://localhost:3000`, Postgres `localhost:5432`.
- Container `api` chay `prisma migrate deploy` truoc khi start; can co thu muc `prisma/migrations` neu muon apply schema. Neu chua co, tao migration dau tien local: `npm run prisma:migrate -- --name init`, commit thu muc `prisma/migrations`, sau do build/up lai.
- Data Postgres luu o volume `db_data` (giu lai qua cac lan chay).

## Chay local (khong Docker)
```bash
npm ci
npm run prisma:generate
npm run start:dev
```

## Lenh thuong dung
- `npm run prisma:generate`
- `npm run prisma:migrate -- --name <ten>`
- `npm run prisma:migrate:deploy`
- `npm run seed:admin`

## Curl kiem tra nhanh API
Gia su server chay tai `http://localhost:3000`.

```bash
# 1) Healthcheck
curl -i http://localhost:3000/health

# 2) Dang nhap (lay token)
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# 3) Lay thong tin user hien tai (thay <TOKEN> bang access token)
curl -i http://localhost:3000/auth/me \
  -H "Authorization: Bearer <TOKEN>"

# 4) Tao san pham moi (can token)
curl -i -X POST http://localhost:3000/products \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"But bi","barcode":"BB001","price":5000,"categoryId":1}'

# 5) Liet ke san pham
curl -i http://localhost:3000/products
```
