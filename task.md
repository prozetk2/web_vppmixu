# 📌 task.md — Project Task List (NestJS + Prisma + Supabase + React + Vite)

## PHASE 0 — PROJECT FOUNDATION
### EPIC 0.1 — Requirement & Flow
- Chốt scope feature (bán hàng, mua hàng, tồn kho, kế toán cơ bản, báo cáo)
- Vẽ user flow cho POS / nhập hàng / báo cáo
- Xác định role hệ thống: ADMIN, ACCOUNTANT, STAFF
- Vẽ sơ đồ menu sidebar FE

### EPIC 0.2 — Database Architecture (Supabase)
- Tạo project Supabase
- Lấy DATABASE_URL → đưa vào .env BE
- Thiết kế ERD: User, Role, Product, Category, Unit, Customer, Supplier, SaleInvoice, SaleItem, Payment, PurchaseOrder, PurchaseItem, Stock, StockMovement
- Chuẩn bị Prisma schema draft

### EPIC 0.3 — API Contract
- Tạo file /docs/api-contract.md
- Viết chi tiết API: Auth, Products, Inventory, Sales, Purchases, Partners, Reports
- Chốt chuẩn response { data, meta, error }

---

## PHASE 1 — SETUP TECHNICAL BASE
### EPIC 1.1 — Backend Setup (NestJS + Prisma)
- Tạo project NestJS
- Cài Prisma + @prisma/client
- npx prisma init
- Tạo PrismaService + PrismaModule
- Exception Filter, Validation Pipe, Response Interceptor
- Enable CORS
- Test kết nối Supabase

### EPIC 1.2 — Frontend Setup (React + TS + Vite)
- Tạo project bằng Vite
- Setup Router, React Query/Zustand
- Cài UI lib (MUI/Tailwind)
- Tạo cấu trúc folder chuẩn
- Tạo login layout & dashboard layout

---

## PHASE 2 — AUTHENTICATION & USER MANAGEMENT
### EPIC 2.1 — Backend Auth
- Prisma model: User, Role
- Bcrypt hash password
- JWT service
- POST /auth/login, GET /auth/me
- RolesGuard + @Roles
- Seed user mặc định

### EPIC 2.2 — Frontend Auth
- Page Login
- Call /auth/login, lưu token
- ProtectedRoute
- Ẩn/hiện menu theo role

---

## PHASE 3 — PRODUCTS & CATEGORIES
### EPIC 3.1 — Backend Product Module
- Prisma models: Product, Category, Unit
- GET/POST/PUT/DELETE products
- CRUD Category
- Validation barcode unique + soft delete

### EPIC 3.2 — Frontend Product Module
- Product List Page (table + search + filter + pagination)
- Product Form Page
- Category Manager
- Toast + validation UI

---

## PHASE 4 — INVENTORY MODULE
### EPIC 4.1 — Backend Inventory
- Models: Warehouse, Stock, StockMovement
- GET /inventory/stock
- POST /inventory/adjust
- Logic: IMPORT, EXPORT, ADJUST
- Transaction đảm bảo tính đúng tồn kho

### EPIC 4.2 — Frontend Inventory
- Inventory Overview Page
- Stock Adjustment Page
- Movement History (optional)

---

## PHASE 5 — SALES / POS MODULE
### EPIC 5.1 — Backend Sales
- Models: SaleInvoice, SaleItem, Payment
- POST /sales (tạo hóa đơn + items + payment + trừ tồn)
- GET /sales
- GET /sales/:id
- POST /sales/:id/return
- Logic mã hóa đơn, VAT, discount, công nợ, transaction

### EPIC 5.2 — Frontend POS
- POS Page: search barcode, add to cart, calc total, payment
- Sales List Page
- Sales Detail Page

---

## PHASE 6 — PURCHASE / SUPPLIER MODULE
### EPIC 6.1 — Backend Purchase
- Models: Supplier, PurchaseOrder, PurchaseItem
- CRUD Supplier
- POST /purchases
- POST /purchases/:id/confirm (nhập kho)
- GET /purchases + detail
- Logic confirm → nhập kho + công nợ NCC

### EPIC 6.2 — Frontend Purchase
- Supplier List + Form
- Purchase Form (add items, giá nhập, số lượng)
- Purchase List

---

## PHASE 7 — CUSTOMER MODULE & DEBTS
### EPIC 7.1 — Backend Customer
- Model: Customer
- CRUD Customer
- GET /customers/:id/debts
- Debt formula: sum(invoice.total - invoice.paid_amount)

### EPIC 7.2 — Frontend Customer
- Customer List
- Customer Form
- Customer Detail (info + history + debt)

---

## PHASE 8 — REPORTS & SETTINGS
### EPIC 8.1 — Backend Reports
- /reports/revenue
- /reports/inventory
- /reports/top-products
- /reports/customer-debts

### EPIC 8.2 — Frontend Reports
- Revenue Report
- Inventory Report
- Top Products Report
- Debt Report

### EPIC 8.3 — Settings
- Backend API update VAT%, store info
- Frontend Settings Page

---

## PHASE 9 — POLISH + SECURITY + DEPLOYMENT
### EPIC 9.1 — Backend Hardening
- DTO validation
- RBAC đầy đủ
- Logging / Audit trail
- Helmet + Rate Limit
- Error handler chuẩn

### EPIC 9.2 — Frontend UX Polish
- Loading + skeleton
- Error boundary
- Retry logic
- Cải thiện POS barcode workflow

### EPIC 9.3 — Deployment
- Deploy BE (Render/Railway/Docker)
- Deploy FE (Cloudflare Pages/Vercel)
- Setup domain + SSL
- Production env config
