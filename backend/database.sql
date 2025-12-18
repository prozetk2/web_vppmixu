-- Database Schema for Warehouse Management System
-- Generated from Prisma schema
-- Tables are ordered to respect foreign key dependencies
-- ============================================
-- INDEPENDENT TABLES (No foreign keys)
-- ============================================
-- Role table
CREATE TABLE IF NOT EXISTS role (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT,
  description TEXT
);
-- User table (app_user)
CREATE TABLE IF NOT EXISTS app_user (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT,
  full_name TEXT,
  phone TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);
-- Category table (self-referencing)
CREATE TABLE IF NOT EXISTS category (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  parent_id BIGINT REFERENCES category(id) ON DELETE
  SET NULL,
    description TEXT
);
-- Chart of Account table (self-referencing)
CREATE TABLE IF NOT EXISTS chart_of_account (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_id BIGINT REFERENCES chart_of_account(id) ON DELETE
  SET NULL,
    type TEXT
);
-- Customer table
CREATE TABLE IF NOT EXISTS customer (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Supplier table
CREATE TABLE IF NOT EXISTS supplier (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Store table
CREATE TABLE IF NOT EXISTS store (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  tax_number TEXT,
  phone TEXT,
  email TEXT,
  settings JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);
-- Product table
CREATE TABLE IF NOT EXISTS product (
  id BIGSERIAL PRIMARY KEY,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category_id BIGINT REFERENCES category(id) ON DELETE
  SET NULL,
    default_price DECIMAL NOT NULL DEFAULT 0,
    default_cost DECIMAL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
-- ============================================
-- DEPENDENT TABLES (Level 1)
-- ============================================
-- UserRole junction table
CREATE TABLE IF NOT EXISTS user_role (
  user_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);
-- AuditLog table
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id BIGINT REFERENCES app_user(id) ON DELETE
  SET NULL,
    action TEXT,
    target_type TEXT,
    target_id BIGINT,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- BankAccount table
CREATE TABLE IF NOT EXISTS bank_account (
  id BIGSERIAL PRIMARY KEY,
  store_id BIGINT REFERENCES store(id) ON DELETE
  SET NULL,
    bank_name TEXT,
    account_number TEXT,
    currency TEXT DEFAULT 'VND',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Warehouse table
CREATE TABLE IF NOT EXISTS warehouse (
  id BIGSERIAL PRIMARY KEY,
  store_id BIGINT REFERENCES store(id) ON DELETE
  SET NULL,
    code TEXT,
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ProductVariant table
CREATE TABLE IF NOT EXISTS product_variant (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  sku TEXT,
  barcode TEXT,
  attributes JSONB,
  price DECIMAL,
  cost DECIMAL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE (product_id, sku)
);
-- Order table
CREATE TABLE IF NOT EXISTS "order" (
  id BIGSERIAL PRIMARY KEY,
  order_number TEXT UNIQUE,
  store_id BIGINT REFERENCES store(id) ON DELETE
  SET NULL,
    customer_id BIGINT REFERENCES customer(id) ON DELETE
  SET NULL,
    channel TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    total_amount DECIMAL NOT NULL DEFAULT 0,
    subtotal DECIMAL NOT NULL DEFAULT 0,
    tax_amount DECIMAL DEFAULT 0,
    discount_amount DECIMAL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
-- PurchaseOrder table
CREATE TABLE IF NOT EXISTS purchase_order (
  id BIGSERIAL PRIMARY KEY,
  order_number TEXT UNIQUE,
  supplier_id BIGINT NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
  warehouse_id BIGINT REFERENCES warehouse(id) ON DELETE
  SET NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    total_amount DECIMAL NOT NULL DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ
);
-- AccountingEntry table
CREATE TABLE IF NOT EXISTS accounting_entry (
  id BIGSERIAL PRIMARY KEY,
  entry_date DATE NOT NULL,
  description TEXT,
  reference_type TEXT,
  reference_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Transaction table
CREATE TABLE IF NOT EXISTS transaction (
  id BIGSERIAL PRIMARY KEY,
  related_type TEXT,
  related_id BIGINT,
  amount DECIMAL NOT NULL,
  gateway TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB
);
-- ============================================
-- DEPENDENT TABLES (Level 2)
-- ============================================
-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id BIGSERIAL PRIMARY KEY,
  variant_id BIGINT NOT NULL REFERENCES product_variant(id) ON DELETE CASCADE,
  warehouse_id BIGINT NOT NULL REFERENCES warehouse(id) ON DELETE CASCADE,
  quantity BIGINT NOT NULL DEFAULT 0,
  reserved BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (variant_id, warehouse_id)
);
-- OrderItem table
CREATE TABLE IF NOT EXISTS order_item (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
  variant_id BIGINT NOT NULL REFERENCES product_variant(id) ON DELETE CASCADE,
  quantity BIGINT NOT NULL,
  unit_price DECIMAL NOT NULL,
  total_price DECIMAL NOT NULL,
  discount DECIMAL DEFAULT 0
);
-- Payment table
CREATE TABLE IF NOT EXISTS payment (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES "order"(id) ON DELETE
  SET NULL,
    amount DECIMAL NOT NULL,
    method TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    reference TEXT,
    paid_at TIMESTAMPTZ
);
-- Invoice table
CREATE TABLE IF NOT EXISTS invoice (
  id BIGSERIAL PRIMARY KEY,
  invoice_number TEXT UNIQUE,
  order_id BIGINT REFERENCES "order"(id) ON DELETE
  SET NULL,
    store_id BIGINT REFERENCES store(id) ON DELETE
  SET NULL,
    customer_id BIGINT REFERENCES customer(id) ON DELETE
  SET NULL,
    total_amount DECIMAL,
    tax_amount DECIMAL,
    status TEXT DEFAULT 'DRAFT',
    issued_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- PurchaseItem table
CREATE TABLE IF NOT EXISTS purchase_item (
  id BIGSERIAL PRIMARY KEY,
  purchase_order_id BIGINT NOT NULL REFERENCES purchase_order(id) ON DELETE CASCADE,
  variant_id BIGINT NOT NULL REFERENCES product_variant(id) ON DELETE CASCADE,
  quantity BIGINT NOT NULL,
  unit_cost DECIMAL NOT NULL,
  total_cost DECIMAL NOT NULL
);
-- StockMovement table
CREATE TABLE IF NOT EXISTS stock_movement (
  id BIGSERIAL PRIMARY KEY,
  movement_type TEXT NOT NULL,
  reference TEXT,
  variant_id BIGINT NOT NULL REFERENCES product_variant(id) ON DELETE CASCADE,
  from_warehouse_id BIGINT REFERENCES warehouse(id) ON DELETE
  SET NULL,
    to_warehouse_id BIGINT REFERENCES warehouse(id) ON DELETE
  SET NULL,
    quantity BIGINT NOT NULL,
    performed_by BIGINT REFERENCES app_user(id) ON DELETE
  SET NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    note TEXT
);
-- AccountingLine table
CREATE TABLE IF NOT EXISTS accounting_line (
  id BIGSERIAL PRIMARY KEY,
  accounting_entry_id BIGINT NOT NULL REFERENCES accounting_entry(id) ON DELETE CASCADE,
  account_id BIGINT NOT NULL REFERENCES chart_of_account(id) ON DELETE CASCADE,
  debit DECIMAL DEFAULT 0,
  credit DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================
-- DEPENDENT TABLES (Level 3)
-- ============================================
-- InvoiceEInvoice table
CREATE TABLE IF NOT EXISTS invoice_einvoice (
  id BIGSERIAL PRIMARY KEY,
  invoice_id BIGINT NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
  provider TEXT,
  external_id TEXT,
  signed BOOLEAN DEFAULT false,
  pdf_url TEXT,
  xml_content TEXT,
  issued_at TIMESTAMPTZ,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_username ON app_user(username);
CREATE INDEX IF NOT EXISTS idx_user_email ON app_user(email);
CREATE INDEX IF NOT EXISTS idx_product_sku ON product(sku);
CREATE INDEX IF NOT EXISTS idx_product_category ON product(category_id);
CREATE INDEX IF NOT EXISTS idx_product_variant_product ON product_variant(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variant_barcode ON product_variant(barcode);
CREATE INDEX IF NOT EXISTS idx_warehouse_store ON warehouse(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_variant ON inventory(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_order_customer ON "order"(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_store ON "order"(store_id);
CREATE INDEX IF NOT EXISTS idx_order_number ON "order"(order_number);
CREATE INDEX IF NOT EXISTS idx_invoice_order ON invoice(order_id);
CREATE INDEX IF NOT EXISTS idx_invoice_customer ON invoice(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_code ON customer(code);
CREATE INDEX IF NOT EXISTS idx_supplier_code ON supplier(code);
CREATE INDEX IF NOT EXISTS idx_purchase_order_supplier ON purchase_order(supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_movement_variant ON stock_movement(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movement_from_warehouse ON stock_movement(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movement_to_warehouse ON stock_movement(to_warehouse_id);
-- ============================================
-- SEED DATA
-- ============================================
-- Insert default admin role
INSERT INTO role (code, name, description)
VALUES (
    'ADMIN',
    'Administrator',
    'System administrator with full access'
  ) ON CONFLICT (code) DO NOTHING;
-- Insert default admin user
-- Password: admin123 (hashed with bcrypt)
INSERT INTO app_user (
    username,
    email,
    password_hash,
    full_name,
    enabled
  )
VALUES (
    'admin',
    'admin@example.com',
    '$2b$10$ohceRlz2HpD1IcKeOisgjeMRYHW1MWls35kft9BrpXSil7ROqfcl.',
    'Administrator',
    true
  ) ON CONFLICT (username) DO NOTHING;
-- Link admin user to admin role
INSERT INTO user_role (user_id, role_id)
SELECT u.id,
  r.id
FROM app_user u,
  role r
WHERE u.username = 'admin'
  AND r.code = 'ADMIN' ON CONFLICT (user_id, role_id) DO NOTHING;
-- Insert sample categories
INSERT INTO category (name, code, description)
VALUES (
    'Văn phòng phẩm',
    'VPP',
    'Các sản phẩm văn phòng phẩm'
  ),
  ('Điện tử', 'DT', 'Thiết bị điện tử'),
  ('Thực phẩm', 'TP', 'Thực phẩm và đồ uống') ON CONFLICT (code) DO NOTHING;
-- Insert sample store
INSERT INTO store (code, name, address, phone, email)
VALUES (
    'CH001',
    'Cửa hàng chính',
    '123 Đường ABC, Quận 1, TP.HCM',
    '0123456789',
    'store@example.com'
  ) ON CONFLICT (code) DO NOTHING;
-- Insert sample warehouse
INSERT INTO warehouse (code, name, address, store_id)
SELECT 'KHO001',
  'Kho trung tâm',
  '456 Đường XYZ, Quận 2, TP.HCM',
  s.id
FROM store s
WHERE s.code = 'CH001' ON CONFLICT DO NOTHING;