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

4. Run database migration in Supabase SQL Editor:
```bash
# Copy content from supabase-migration.sql and run in Supabase SQL Editor
```

5. Start development server:
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

## Default Login

- **Username:** `admin`
- **Password:** `admin123`

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
