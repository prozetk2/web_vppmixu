<![CDATA[# 🏪 Warehouse Management System (WMS)

> Hệ thống quản lý kho hàng và bán hàng toàn diện — Phong cách KiotViet  
> Full-stack application được phát triển bởi sự cộng tác giữa **con người** và **AI (Gemini/Antigravity)**.

---

## 📖 Giới thiệu

Đây là hệ thống quản lý kho hàng, bán hàng, và công nợ dành cho doanh nghiệp vừa và nhỏ. Ứng dụng cung cấp đầy đủ các tính năng từ quản lý sản phẩm, nhập/xuất kho, bán hàng POS, đến báo cáo doanh thu — được thiết kế theo phong cách **KiotViet** với giao diện hiện đại và trải nghiệm người dùng mượt mà.

---

## 🆕 Cập nhật gần đây (2026-03-29)

- Tách riêng layout in `A4` và `A5`, không còn dùng chung một mẫu rồi scale.
- Chuẩn hóa báo cáo tồn kho để hiểu `SALE` là xuất, `RETURN` là nhập; bổ sung drill-down chi tiết khi click vào sản phẩm.
- Thêm metadata cho `stock_movement` để truy vết `đã bán theo đơn vị nào`, `từ chứng từ nào`.
- Bổ sung mô hình đa đơn vị: `đơn vị bán`, `đơn vị cơ bản`, `tỷ lệ quy đổi`; POS tự quy đổi về tồn kho cơ bản.
- Sửa runtime Prisma để backend ưu tiên `DIRECT_URL` và fail-fast khi không kết nối được database.

Xem chi tiết thay đổi và checklist test ở [update.md](update.md).

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

### Backend

| Công nghệ | Phiên bản | Vai trò |
|---|---|---|
| **NestJS** | ^11.0.1 | Framework Node.js chính, kiến trúc module |
| **TypeScript** | ^5.7.3 | Ngôn ngữ lập trình type-safe |
| **Supabase** | ^2.86.2 | Cơ sở dữ liệu PostgreSQL (cloud) + Storage |
| **Prisma** | ^5.22.0 | ORM quản lý schema & truy vấn database |
| **Passport + JWT** | ^0.7.0 / ^11.0.0 | Xác thực người dùng (Authentication) |
| **bcrypt** | ^5.1.1 | Mã hóa mật khẩu |
| **class-validator** | ^0.14.1 | Validate dữ liệu DTO |
| **class-transformer** | ^0.5.1 | Transform dữ liệu request/response |
| **uuid** | ^13.0.0 | Tạo ID duy nhất |

### Frontend

| Công nghệ | Phiên bản | Vai trò |
|---|---|---|
| **React** | ^19.2.0 | Thư viện UI chính |
| **TypeScript** | ~5.9.3 | Type-safe development |
| **Vite** | ^7.2.4 | Build tool & Dev server nhanh |
| **React Router DOM** | ^6.30.2 | Điều hướng SPA |
| **Axios** | ^1.13.2 | HTTP Client gọi API |
| **React Icons** | ^5.5.0 | Bộ icon thống nhất |
| **ExcelJS** | ^4.4.0 | Tạo & xử lý file Excel nâng cao |
| **xlsx / xlsx-js-style** | ^0.18.5 / ^1.2.0 | Import/Export Excel với style |
| **file-saver** | ^2.0.5 | Download file phía client |
| **pdfjs-dist** | ^4.10.38 | Xử lý PDF |

### DevOps & Deployment

| Công nghệ | Vai trò |
|---|---|
| **Docker** + **Docker Compose** | Container hóa ứng dụng |
| **Nginx** | Reverse proxy + phục vụ static files |
| **Let's Encrypt** | SSL/HTTPS miễn phí |
| **Git Flow** | Quản lý nhánh (main → develop → feature) |

### Cơ sở dữ liệu & Storage

| Dịch vụ | Vai trò |
|---|---|
| **Supabase PostgreSQL** | Database chính (cloud-hosted) |
| **Supabase Storage** | Lưu trữ hình ảnh sản phẩm (CDN) |
| **Prisma ORM** | Schema management, migrations, queries |

---

## 🏗️ Kiến trúc hệ thống

```
┌──────────────────────────────────────────────────┐
│                   FRONTEND                        │
│          React + TypeScript + Vite                │
│    ┌──────────┬──────────┬──────────────────┐     │
│    │   POS    │ Products │  Reports/Charts  │     │
│    │  Sales   │ Invoices │  Inventory       │     │
│    │ Customers│ Suppliers│  Settings        │     │
│    └────┬─────┴────┬─────┴────────┬─────────┘     │
│         │   Axios  │              │               │
│         └──────────┴──────────────┘               │
│                    │ HTTP/REST                     │
│                    ▼                              │
├──────────────────────────────────────────────────┤
│                   NGINX (Docker)                  │
│         Reverse Proxy + SSL Termination           │
├──────────────────────────────────────────────────┤
│                    │                              │
│                    ▼                              │
│                  BACKEND                          │
│          NestJS + TypeScript                      │
│    ┌──────────────────────────────────────┐       │
│    │  Auth Module    │  Products Module   │       │
│    │  Sales Module   │  Invoices Module   │       │
│    │  Purchases Mod. │  Inventory Module  │       │
│    │  Customers Mod. │  Suppliers Module  │       │
│    │  Reports Module │  Dashboard Module  │       │
│    │  Price Lists    │  Settings Module   │       │
│    │  Upload Module  │  Warehouses Mod.   │       │
│    │  Categories     │  Units Module      │       │
│    │  Stores Module  │  Common Module     │       │
│    └───────────┬─────┴──────────┬─────────┘       │
│        Prisma ORM               │                 │
│                │                │                 │
│                ▼                ▼                 │
│    ┌───────────────┐   ┌──────────────┐          │
│    │   Supabase    │   │  Supabase    │          │
│    │  PostgreSQL   │   │  Storage     │          │
│    │  (Database)   │   │  (Images)    │          │
│    └───────────────┘   └──────────────┘          │
└──────────────────────────────────────────────────┘
```

---

## ✨ Tính năng chi tiết

### 🔐 Xác thực & Phân quyền
- Đăng nhập JWT với mã hóa bcrypt
- Role-Based Access Control (ADMIN, ACCOUNTANT, STAFF)
- Protected Routes trên Frontend
- Ẩn/hiện menu theo vai trò người dùng

### 📦 Quản lý Sản phẩm
- CRUD sản phẩm đầy đủ
- Quản lý danh mục (Category) & đơn vị tính (Unit)
- Import/Export Excel hàng loạt
- Upload hình ảnh qua Supabase Storage
- Mã barcode/SKU duy nhất
- Bộ lọc sidebar theo danh mục, kho

### 🛒 Bán hàng & POS (Point of Sale)
- Giao diện POS chuyên nghiệp với **multi-tab hóa đơn**
- Tìm kiếm sản phẩm bằng **barcode/SKU** (Enter to add)
- Hỗ trợ **nhiều phương thức thanh toán** (Tiền mặt, Thẻ, Chuyển khoản)
- Tích hợp **VietQR** tạo mã QR chuyển khoản ngân hàng
- Chọn khách hàng và thêm nhanh khách mới
- Chiết khấu theo **phần trăm** hoặc **số tiền**
- In hóa đơn nhiều mẫu (A/B/C formats) — tối ưu cho **giấy A5**
- Theo dõi kênh bán hàng (Trực tiếp, Facebook, Instagram)
- Chức năng **trả hàng** (Return order) + hoàn tiền + nhập lại kho
- Input tiền khách thanh toán với **CurrencyInput** (format tự động)

### 🧾 Quản lý Hóa đơn
- Danh sách hóa đơn với **expandable details**
- Bộ lọc theo trạng thái, thời gian, người tạo, nhân viên bán
- Import/Export Excel (tổng hợp & chi tiết)
- In hóa đơn
- Trả lại hóa đơn
- **Sửa hóa đơn qua trang Sales** (phong cách KiotViet)

### 📥 Nhập hàng (Purchases)
- Danh sách đơn nhập hàng với bộ lọc sidebar KiotViet-style
- Biểu mẫu tạo đơn nhập full-page
- Tìm kiếm nhà cung cấp với **quick add**
- Tìm kiếm theo **mã đơn nhập** hoặc **tên nhà cung cấp**
- Chọn cửa hàng/đơn vị tính
- Tự động tạo mã nhập hàng (PN + YYYYMMDD + sequence)
- Bảng sản phẩm với số lượng, giá, chiết khấu
- Xác nhận đơn nhập → tự động cập nhật tồn kho
- Quản lý thanh toán nhà cung cấp (thêm/sửa/xóa phiếu thanh toán)

### 📊 Tồn kho (Inventory)
- Tổng quan tồn kho theo sản phẩm/kho
- Theo dõi lịch sử nhập/xuất kho
- Cảnh báo hàng sắp hết (low stock alerts)
- **Báo cáo tồn kho KiotViet-style** (cột màu, sticky headers)
- **Export Excel nâng cao** (header merged, cột format)

### 📈 Báo cáo
- Báo cáo doanh thu theo khoảng thời gian
- Phân tích bán hàng
- Báo cáo công nợ khách hàng với export Excel
- Dashboard tổng quan (Stats cards, Revenue chart, Top customers)
- Lợi nhuận gộp

### 💰 Bảng giá (Price Lists)
- Quản lý nhiều bảng giá
- Thiết lập bảng giá mặc định
- Giá riêng theo sản phẩm
- **UI redesign** (Sticky headers, compact filters)
- **Import/Export bảng giá** (Excel/CSV)
- **Giá động trong POS** (tự động cập nhật giỏ hàng khi đổi bảng giá)

### 👥 Quản lý Khách hàng & Nhà cung cấp
- CRUD đầy đủ cho khách hàng và nhà cung cấp
- Theo dõi công nợ khách hàng
- Bộ lọc và tìm kiếm nâng cao
- Export danh sách ra Excel

### 🏢 Quản lý Kho & Cửa hàng
- Quản lý nhiều kho hàng
- Multi-company: 1 kho chung, phân biệt giao dịch theo công ty
- Quản lý cửa hàng (Stores)

### ⚙️ Cài đặt
- Thông tin công ty
- Cấu hình VAT %
- Cài đặt in hóa đơn
- Quản lý người dùng

### 🎨 Chuẩn hóa UI
- Page Headers thống nhất (Title - Search - Actions) trên tất cả module
- Nút bấm đồng nhất (Outline Primary cho "Thêm", Secondary cho tools)
- Icon buttons cho Sửa/Xóa (45px, icon 24px)
- Responsive layout

---

## 🚀 Hướng dẫn Cài đặt

### Yêu cầu hệ thống
- **Node.js** 18+
- **npm** hoặc **yarn**
- **Docker** & **Docker Compose** (cho production)
- Tài khoản **Supabase** (database + storage)

### 🔧 Cài đặt Development

#### Backend

```bash
# 1. Di chuyển vào thư mục backend
cd backend

# 2. Cài đặt dependencies
npm install

# 3. Tạo file .env từ mẫu
cp .env.example .env

# 4. Điều chỉnh thông tin trong .env
# DATABASE_URL=<supabase_db_url>
# DIRECT_URL=<supabase_direct_db_url>
# JWT_SECRET=<your_secret>
# SUPABASE_URL=<supabase_project_url>
# SUPABASE_KEY=<supabase_service_role_key>

# 5. Generate Prisma client
npx prisma generate

# 6. Chạy Prisma migration
npx prisma migrate dev

# 7. Tạo tài khoản admin mặc định
npm run seed:admin

# 8. Khởi chạy dev server
npm run start:dev
```

Backend sẽ chạy tại `http://localhost:3000`

#### Frontend

```bash
# 1. Di chuyển vào thư mục frontend
cd frontend

# 2. Cài đặt dependencies
npm install

# 3. Khởi chạy dev server
npm run dev
```

Frontend sẽ chạy tại `http://localhost:5173`

### 🐳 Triển khai Production (Docker)

```bash
# Build và chạy toàn bộ hệ thống
docker compose -f docker-compose.prod.yml up --build -d

# Xem logs
docker compose -f docker-compose.prod.yml logs -f
```

Kiến trúc Docker production:
- **Backend container**: NestJS app (port 3000 internal)
- **Frontend container**: Nginx serving React build + reverse proxy tới backend
- **Nginx**: Xử lý SSL (Let's Encrypt), serve static files, proxy API requests
- **Ports**: 80 (HTTP) và 443 (HTTPS) exposed

### 📱 Đăng nhập mặc định

| Tài khoản | Mật khẩu |
|---|---|
| `admin` | `admin123` |

---

## ✅ Kiểm thử nhanh sau cập nhật

### 1. In hóa đơn A4/A5
- Trong phần cài đặt in của POS, chọn `Khổ giấy in` là `A4`, tạo một đơn ngắn và bấm in.
- Trong popup in của trình duyệt, cũng chọn `A4`, `Tỷ lệ 100`, nên tắt `Đầu trang và chân trang`.
- Lặp lại với `A5`.
- Kết quả mong đợi: bố cục `A4` và `A5` khác nhau thật, không còn cảm giác một mẫu bị co/phóng.

### 2. Chi tiết xuất nhập kho
- Vào `Tồn kho`, click vào một dòng sản phẩm.
- Kết quả mong đợi: mở modal chi tiết có `thời gian`, `loại`, `chứng từ`, `công ty`, `kho`, `số lượng`, `ghi chú`; với giao dịch bán hàng sẽ có thêm thông tin khách hàng nếu hóa đơn có dữ liệu.

### 3. Đa đơn vị và quy đổi tồn kho
- Tạo hoặc sửa một sản phẩm có `ĐVT bán`, `ĐVT cơ bản` và `Tỷ lệ quy đổi`.
- Bán sản phẩm đó trên POS bằng đơn vị bán.
- Kết quả mong đợi: hóa đơn hiển thị theo đơn vị bán, còn tồn kho giảm theo đơn vị cơ bản; báo cáo tồn kho hiển thị được cả số lượng cơ bản và số lượng quy đổi.

Checklist đầy đủ hơn nằm ở [update.md](update.md).

---

## 📁 Cấu trúc dự án

```
web_vppmixu/
├── backend/                    # NestJS Backend
│   ├── src/
│   │   ├── auth/              # Xác thực JWT + Role Guard
│   │   ├── products/          # Quản lý sản phẩm
│   │   ├── categories/        # Quản lý danh mục
│   │   ├── units/             # Đơn vị tính
│   │   ├── customers/         # Quản lý khách hàng
│   │   ├── suppliers/         # Quản lý nhà cung cấp
│   │   ├── sales/             # Bán hàng & POS
│   │   ├── invoices/          # Hóa đơn
│   │   ├── purchases/         # Nhập hàng
│   │   ├── inventory/         # Tồn kho
│   │   ├── warehouses/        # Kho hàng
│   │   ├── stores/            # Cửa hàng
│   │   ├── price-lists/       # Bảng giá
│   │   ├── reports/           # Báo cáo
│   │   ├── dashboard/         # Dashboard
│   │   ├── settings/          # Cài đặt hệ thống
│   │   ├── upload/            # Upload file/ảnh
│   │   ├── supabase/          # Supabase service
│   │   ├── prisma/            # Prisma service
│   │   ├── common/            # Guards, decorators, utils
│   │   └── main.ts            # Entry point
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── Dockerfile             # Production Docker image
│   └── Dockerfile.dev         # Development Docker image
│
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── sales/         # POS, Sales list
│   │   │   ├── invoices/      # Hóa đơn
│   │   │   ├── purchases/     # Nhập hàng
│   │   │   ├── products/      # Sản phẩm
│   │   │   ├── categories/    # Danh mục
│   │   │   ├── customers/     # Khách hàng
│   │   │   ├── suppliers/     # Nhà cung cấp
│   │   │   ├── inventory/     # Tồn kho
│   │   │   ├── warehouses/    # Kho hàng
│   │   │   ├── price-lists/   # Bảng giá
│   │   │   ├── reports/       # Báo cáo
│   │   │   ├── dashboard/     # Dashboard
│   │   │   ├── settings/      # Cài đặt
│   │   │   ├── pos/           # POS components
│   │   │   ├── shared/        # Shared/common components
│   │   │   ├── Dashboard.tsx  # Main Dashboard
│   │   │   └── Login.tsx      # Trang đăng nhập
│   │   ├── services/
│   │   │   └── api.ts         # Axios API service
│   │   ├── App.tsx            # Router chính
│   │   └── main.tsx           # Entry point
│   ├── Dockerfile             # Production Docker image (Nginx)
│   └── nginx-ssl.conf         # Cấu hình Nginx
│
├── docs/                       # Tài liệu
│   ├── HUONG_DAN_SU_DUNG.md  # Hướng dẫn sử dụng đầy đủ
│   └── api-contract.md        # API Contract
│
├── docker-compose.prod.yml    # Docker Compose production
├── gitflow.md                 # Quy trình Git Flow
├── task.md                    # Task list & Roadmap
└── nhiemvu.md                 # Nhiệm vụ triển khai
```

---

## 🔌 API Endpoints chính

### Authentication
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/auth/login` | Đăng nhập |
| GET | `/auth/me` | Lấy thông tin user hiện tại |

### Products
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/products` | Danh sách sản phẩm |
| POST | `/products` | Tạo sản phẩm |
| PUT | `/products/:id` | Cập nhật sản phẩm |
| DELETE | `/products/:id` | Xóa sản phẩm |

### Sales & POS
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/sales` | Tạo đơn bán hàng |
| GET | `/sales` | Danh sách đơn hàng |
| GET | `/sales/:id` | Chi tiết đơn hàng |
| POST | `/sales/:id/return` | Trả hàng + hoàn tiền |

### Purchases
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/purchases` | Tạo đơn nhập |
| GET | `/purchases` | Danh sách đơn nhập |
| POST | `/purchases/:id/confirm` | Xác nhận → nhập kho |
| DELETE | `/purchases/:id` | Xóa đơn nhập |
| GET | `/purchases/export` | Export Excel |

### Inventory
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/inventory/stock` | Xem tồn kho |
| POST | `/inventory/adjust` | Điều chỉnh tồn kho |
| GET | `/inventory/report` | Báo cáo tồn kho |

### Các module khác
- `/categories` — Quản lý danh mục
- `/customers` — Quản lý khách hàng
- `/suppliers` — Quản lý nhà cung cấp
- `/warehouses` — Quản lý kho
- `/invoices` — Quản lý hóa đơn
- `/price-lists` — Quản lý bảng giá
- `/reports` — Báo cáo doanh thu, công nợ
- `/dashboard` — Dữ liệu dashboard
- `/settings` — Cài đặt hệ thống
- `/upload` — Upload hình ảnh

---

## 🤝 Quá trình hợp tác phát triển (Human × AI Collaboration)

Dự án này được phát triển thông qua sự cộng tác giữa **con người (developer)** và **AI assistant (Gemini/Antigravity)**. Đây là quá trình pair-programming liên tục qua nhiều phiên làm việc.

### 📅 Lịch trình phát triển

| Giai đoạn | Thời gian | Nội dung |
|---|---|---|
| **Phase 0-1** | Khởi tạo | Setup project, database schema, API contract |
| **Phase 2** | Foundation | Authentication, User management |
| **Phase 3** | Core | Products, Categories, Units CRUD |
| **Phase 4** | Inventory | Warehouse, Stock, StockMovement |
| **Phase 5** | Sales | POS, Invoices, Payment, VietQR |
| **Phase 6** | Purchases | Purchase Orders, Supplier management |
| **Phase 7** | Partners | Customer debt tracking, Supplier payments |
| **Phase 8** | Reports | Dashboard, Revenue, Inventory reports |
| **Phase 9** | Polish | UI standardization, Bug fixes, Deployment |

### 💬 Phương thức trao đổi

Quá trình phát triển diễn ra qua **nhiều cuộc hội thoại (conversations)** liên tục, mỗi cuộc tập trung vào một vấn đề cụ thể:

1. **Thiết kế & Lên kế hoạch**: Thảo luận kiến trúc hệ thống, chọn công nghệ, thiết kế database schema (ERD), vẽ flow chart cho từng module.

2. **Phát triển tính năng từng Phase**: Mỗi phase được thực hiện qua nhiều cuộc trao đổi:
   - Developer mô tả yêu cầu nghiệp vụ
   - AI phân tích, đề xuất giải pháp kỹ thuật
   - Cùng code backend (NestJS modules, services, controllers)
   - Cùng code frontend (React components, pages, API integration)
   - Review code và fix bugs

3. **Debug & Fix Issues**: Các phiên sửa lỗi cụ thể như:
   - Sửa layout in hóa đơn cho giấy A5
   - Fix lỗi ngày tháng hiển thị sai trên hóa đơn
   - Sửa mã đơn hàng hiển thị không đúng khi in
   - Fix input thanh toán POS (thêm CurrencyInput component)
   - Khôi phục dữ liệu bị mất

4. **UI/UX Improvements**: Cải thiện giao diện liên tục:
   - Chuẩn hóa icon buttons (Sửa/Xóa) trên toàn bộ module
   - Redesign bảng giá với sticky headers
   - Thêm tìm kiếm theo tên nhà cung cấp trong nhập hàng
   - Thêm chức năng sửa/xóa phiếu thanh toán nhà cung cấp

5. **Deployment & DevOps**: Thiết lập Docker, Nginx, SSL cho production.

6. **Documentation**: Tạo hướng dẫn sử dụng chi tiết cho người dùng cuối.

### 🔄 Quy trình làm việc điển hình

```
Developer yêu cầu tính năng mới
       │
       ▼
AI phân tích → Đề xuất Implementation Plan
       │
       ▼
Review & Điều chỉnh kế hoạch
       │
       ▼
AI code Backend (Module, Service, Controller, DTO)
       │
       ▼
AI code Frontend (Component, Page, CSS, API service)
       │
       ▼
Developer test thực tế trên browser
       │
       ▼
Feedback → AI sửa lỗi / cải thiện
       │
       ▼
Commit → Deploy (Docker rebuild)
```

### 🧠 Vai trò của AI trong dự án

- **Kiến trúc sư**: Thiết kế database schema, API contract, module structure
- **Full-stack Developer**: Viết code NestJS backend + React frontend
- **Code Reviewer**: Phân tích code hiện có, đề xuất cải thiện
- **Debugger**: Phân tích và sửa bugs phức tạp (date handling, print layout, etc.)
- **Tech Writer**: Viết tài liệu hướng dẫn sử dụng, API docs
- **DevOps**: Cấu hình Docker, Nginx, SSL

---

## 📚 Tài liệu bổ sung

| Tài liệu | Mô tả |
|---|---|
| [Hướng dẫn sử dụng](docs/HUONG_DAN_SU_DUNG.md) | User manual đầy đủ cho người dùng cuối |
| [API Contract](docs/api-contract.md) | Chi tiết các API endpoint |
| [update.md](update.md) | Tổng hợp thay đổi mới nhất và kịch bản test |
| [Git Flow Guide](gitflow.md) | Quy trình quản lý Git branch |
| [Task List](task.md) | Roadmap & task tracking |

---

## 📋 Scripts hữu ích

### Backend
```bash
npm run start:dev          # Chạy dev server (hot reload)
npm run build              # Build production
npm run start:prod         # Chạy production
npm run seed:admin         # Tạo tài khoản admin
npm run prisma:migrate     # Chạy migration
npm run prisma:generate    # Generate Prisma client
npm run docker:dev         # Chạy dev bằng Docker
npm run docker:dev:rebuild # Rebuild Docker dev
npm run test               # Chạy unit tests
npm run lint               # Lint code
```

### Frontend
```bash
npm run dev                # Chạy dev server
npm run build              # Build production (TypeScript check + Vite build)
npm run preview            # Preview production build
npm run lint               # Lint code
```

---

## 📄 License

MIT

---

> 💡 *Dự án này là minh chứng cho sức mạnh của việc kết hợp giữa kiến thức nghiệp vụ của con người và khả năng coding của AI — tạo ra sản phẩm hoàn chỉnh trong thời gian ngắn.*
]]>
