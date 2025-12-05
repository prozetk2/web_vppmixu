# Warehouse Management System

A full-stack warehouse and debt management application built with NestJS, React, and Supabase.

## Tech Stack

### Backend
- **NestJS** - Node.js framework
- **Supabase** - PostgreSQL database & authentication
- **Prisma** - Database ORM (optional)
- **JWT** - Authentication
- **bcrypt** - Password hashing

### Frontend
- **React** - UI library
- **Vite** - Build tool
- **Axios** - HTTP client
- **TypeScript** - Type safety

## Features

- ✅ User Authentication (JWT)
- ✅ Product Management
- ✅ Category Management
- ✅ Warehouse Management
- ✅ Customer Management
- ✅ Supplier Management
- ✅ Excel Data Import (Seed Data from Excel to Supabase)

## Quick Start - Import Data from Excel

### Option 1: Using Quick Start Script (Recommended)
```bash
# Windows
seed-quick-start.bat
```

### Option 2: Manual Steps
```bash
# 1. Prepare your data.xlsx file in the root directory
# 2. Validate the Excel structure
cd backend
npm run validate:excel

# 3. Seed data to Supabase
npm run seed:data
```

📖 **Detailed Guide**: See [backend/README_SEED.md](backend/README_SEED.md) for complete documentation
📋 **Excel Template**: See [backend/EXCEL_TEMPLATE.md](backend/EXCEL_TEMPLATE.md) for structure examples

## Setup

### Prerequisites
- Node.js 18+
- Supabase account

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Copy `.env.example` to `.env` and fill in your Supabase credentials:
```bash
cp .env.example .env
```

4. Run database migration:
```bash
npm run prisma:generate
npm run prisma:migrate:deploy
```

5. **Seed data from Excel** (Recommended):
```bash
# Option 1: Generate sample data
npm run generate:sample-excel
npm run seed:data

# Option 2: Use your own data.xlsx (place in root directory)
npm run validate:excel
npm run seed:data
```

6. Start development server:
```bash
npm run start:dev
```

Backend will run on `http://localhost:3000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

## After Seeding Data - What's Next?

### Quick Test API
```bash
# Windows PowerShell (Recommended)
.\test-api.ps1

# Or CMD
test-api.bat
```

### View Seeded Data
```bash
# Open Prisma Studio
cd backend
npx prisma studio
# Visit http://localhost:5555
```

### Test Login
- **Username:** `admin`
- **Password:** `admin123`

📖 **Complete Guide**: See [AFTER_SEED_GUIDE.md](AFTER_SEED_GUIDE.md) for detailed next steps

## API Endpoints

### Authentication
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user

### Products
- `GET /products` - List all products
- `POST /products` - Create product
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product

## License

MIT
