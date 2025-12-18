-- Create tables for Warehouse Management System
-- Run this in Supabase SQL Editor
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Create Role table
CREATE TABLE IF NOT EXISTS role (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create User table (app_user)
CREATE TABLE IF NOT EXISTS app_user (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create UserRole junction table
CREATE TABLE IF NOT EXISTS user_role (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES role(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);
-- Create Category table
CREATE TABLE IF NOT EXISTS category (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE,
    description TEXT,
    parent_id BIGINT REFERENCES category(id) ON DELETE
    SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create Product table
CREATE TABLE IF NOT EXISTS product (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    description TEXT,
    category_id BIGINT REFERENCES category(id) ON DELETE
    SET NULL,
        default_price DECIMAL(15, 2),
        default_cost DECIMAL(15, 2),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create Store table
CREATE TABLE IF NOT EXISTS store (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE,
    address TEXT,
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create Warehouse table
CREATE TABLE IF NOT EXISTS warehouse (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE,
    address TEXT,
    store_id BIGINT REFERENCES store(id) ON DELETE
    SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create Customer table
CREATE TABLE IF NOT EXISTS customer (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    tax_number VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create Supplier table
CREATE TABLE IF NOT EXISTS supplier (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    tax_number VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Insert default admin role
INSERT INTO role (code, name)
VALUES ('ADMIN', 'Administrator') ON CONFLICT (code) DO NOTHING;
-- Insert default admin user (password: admin123)
-- Password hash for 'admin123' with bcrypt
INSERT INTO app_user (username, email, password_hash, full_name)
VALUES (
        'admin',
        'admin@example.com',
        '$2b$10$xcO9dIFsNg06rBO6j9I3q.JZR0KzojUYr4oPK.p1w92aR5ZX.WId.',
        'Administrator'
    ) ON CONFLICT (username) DO NOTHING;
-- Link admin user to admin role
INSERT INTO user_role (user_id, role_id)
SELECT u.id,
    r.id
FROM app_user u,
    role r
WHERE u.username = 'admin'
    AND r.code = 'ADMIN' ON CONFLICT (user_id, role_id) DO NOTHING;
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_username ON app_user(username);
CREATE INDEX IF NOT EXISTS idx_user_email ON app_user(email);
CREATE INDEX IF NOT EXISTS idx_product_sku ON product(sku);
CREATE INDEX IF NOT EXISTS idx_product_category ON product(category_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_store ON warehouse(store_id);
CREATE INDEX IF NOT EXISTS idx_customer_code ON customer(code);
CREATE INDEX IF NOT EXISTS idx_supplier_code ON supplier(code);