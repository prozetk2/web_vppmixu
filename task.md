# 📌 task.md — Project Task List (NestJS + Prisma + Supabase + React + Vite)

---

## 📊 TIẾN ĐỘ HIỆN TẠI

### ✅ Hoàn thành (100%)
- [x] **Sản phẩm (Product)** - CRUD, Import/Export Excel, Filter sidebar
- [x] **Nhà cung cấp (Supplier)** - CRUD, Import/Export Excel
- [x] **Khách hàng (Customer)** - CRUD, Import/Export Excel
- [x] **Hóa đơn (Invoice)** - Danh sách, Chi tiết, Import/Export

### 🔄 Đang làm: Kho hàng (90%)
- [x] **Warehouse (Quản lý Kho)** - CRUD + manager, active, notes, totalValue
- [x] **Inventory (Tồn kho)** - Xem tồn, filter, export
- [x] **StockMovement (Nhập/Xuất/Điều chỉnh)** - Forms, logic, bulk import
- [x] **Inventory Report (Báo cáo)** - Đầu kỳ, nhập, xuất, cuối kỳ
- [x] **Multi-Company** - 1 kho, phân biệt giao dịch theo công ty (storeId tracking)
- [ ] **Testing & Verification** - Kiểm tra xem dữ liệu có đúng không

### ⏳ Chờ làm
- [ ] Purchase Order (Đơn nhập hàng)
- [ ] Sales/POS (Bán hàng)
- [ ] Reports (Báo cáo)
- [ ] Settings

---

## 🏢 MULTI-COMPANY INVENTORY IMPLEMENTATION

### Goal
1 kho chung, tồn kho chung, nhưng **mỗi giao dịch nhập/xuất ghi nhận thuộc công ty nào**

### 1. Database Schema (cần thêm)

**Sửa `StockMovement`:**
```prisma
model StockMovement {
  ...existing fields...
  storeId  BigInt?  @map("store_id")  // Công ty thực hiện giao dịch
  store    Store?   @relation(fields: [storeId], references: [id])
}
```

**Sửa `Store`:**
```prisma
model Store {
  ...existing fields...
  stockMovements StockMovement[]
}
```

### 2. Backend API Changes

| Endpoint | Thay đổi |
|----------|----------|
| `POST /inventory/adjust` | Thêm param `storeId` |
| `POST /inventory/bulk` | Thêm param `storeId` |
| `GET /inventory/report` | Thêm filter `storeId` |

### 3. Frontend Changes

Thêm dropdown **"Chọn công ty"** trong:
- [ ] Trang nhập/xuất kho
- [ ] Báo cáo tồn kho
- [ ] Filter sidebar

### 4. Verification

1. Tạo 2 công ty (Store) trong database
2. Nhập hàng với công ty A → ghi nhận `storeId = A`
3. Báo cáo filter công ty A → chỉ thấy giao dịch của A

---

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

---

## 📋 DETAILED TASK BREAKDOWN FOR REMAINING MODULES

### 📦 Module 1: Purchase Orders

#### Backend
- [ ] Review `PurchaseOrder` and `PurchaseItem` models
- [ ] Add missing fields (status, notes, supplierId, warehouseId)
- [ ] **Service Methods:**
  - [ ] `create()` - Create PO with items
  - [ ] `findAll()` - List with filters (supplier, status, date)
  - [ ] `findOne()` - Get PO details
  - [ ] `update()` - Update (DRAFT only)
  - [ ] `confirm()` - Confirm → create IMPORT movements
  - [ ] `cancel()` - Cancel PO
- [ ] **Controller Endpoints:**
  - [ ] `POST /purchases`
  - [ ] `GET /purchases`
  - [ ] `GET /purchases/:id`
  - [ ] `PUT /purchases/:id`
  - [ ] `POST /purchases/:id/confirm`
- [ ] Link PO confirm → auto-deduct inventory

#### Frontend
- [ ] **PO List Page:** Table, filters, search, pagination
- [ ] **PO Form:** Supplier, warehouse, items table, total calc
- [ ] **PO Detail:** Info, items, status, actions, print
- [ ] Create `purchasesAPI` service
- [ ] Integrate confirmation flow

**Estimate:** 2-3 days

---

### 💰 Module 2: Sales/POS (PRIORITY #1)

#### Backend
- [ ] Review Invoice/SaleInvoice models
- [ ] **Service Enhancements:**
  - [ ] ✅ `create()` with auto-deduct (done)
  - [ ] `return()` - Return invoice + restock
  - [ ] `updatePayment()` - Payment status
- [ ] **POS Features:**
  - [ ] Quick barcode search
  - [ ] Discount calc (%, amount)
  - [ ] Multiple payment methods

#### Frontend
- [ ] **POS Page:** ⭐ Main feature
  - [ ] Barcode scanner input
  - [ ] Product autocomplete
  - [ ] Shopping cart
  - [ ] Quantity adjust
  - [ ] Discount input
  - [ ] Payment panel (Cash/Card/Transfer/Wallet)
  - [ ] Customer selection
  - [ ] Print receipt
- [ ] **Sales List:** Table, filters, export Excel
- [ ] **Sales Detail:** Header, items, payment, actions
- [ ] **Return Flow:**
  - [ ] Select invoice
  - [ ] Select return items
  - [ ] Calculate refund
  - [ ] Auto restock
- [ ] Update `salesAPI`/`invoicesAPI`

**Estimate:** 3-4 days

---

### 📊 Module 3: Reports

#### Backend
- [ ] **Revenue Report Service:**
  - [ ] Daily/monthly/yearly revenue
  - [ ] Group by period, store, channel
  - [ ] Export Excel
- [ ] **Inventory Report (enhance):**
  - [ ] ✅ Basic report exists
  - [ ] Value-based reporting (unitCost)
  - [ ] Movement history by product
  - [ ] Low stock alerts
- [ ] **Top Products Report:**
  - [ ] Most sold
  - [ ] Most revenue
- [ ] **Debt Reports:**
  - [ ] Customer debts with aging
  - [ ] Supplier debts with aging
- [ ] **Controller:**
  - [ ] `GET /reports/revenue`
  - [ ] `GET /reports/inventory-value`
  - [ ] `GET /reports/top-products`
  - [ ] `GET /reports/customer-debts`
  - [ ] `GET /reports/supplier-debts`

#### Frontend
- [ ] **Dashboard:** Charts, stats cards
- [ ] **Revenue Report:** Date range, charts, export
- [ ] **Inventory Value:** Total value, by category/warehouse
- [ ] **Top Products:** Charts + tables
- [ ] **Debt Reports:** Lists, aging analysis, export

**Estimate:** 2-3 days

---

### ⚙️ Module 4: Settings

#### Backend
- [ ] Create `Settings` model (singleton)
- [ ] **Service:**
  - [ ] `getSettings()`
  - [ ] `updateSettings()`
- [ ] **Controller:**
  - [ ] `GET /settings`
  - [ ] `PUT /settings`
- [ ] User management (if not done)

#### Frontend
- [ ] **Company Settings:** Name, address, tax, logo
- [ ] **Tax Settings:** Default VAT %
- [ ] **Inventory Settings:** Default warehouse, low stock threshold
- [ ] **Sales Settings:** Invoice format, auto print
- [ ] **User Management:** List, add, edit, roles

**Estimate:** 1-2 days

---

## 🎯 IMPLEMENTATION PRIORITY

1. **Sales/POS** ⭐⭐⭐ (Critical - core business)
2. **Purchase Orders** ⭐⭐ (Important - inventory control)
3. **Reports** ⭐⭐ (Insights)
4. **Settings** ⭐ (Can use defaults)

**Total MVP Time:** 10-12 days
