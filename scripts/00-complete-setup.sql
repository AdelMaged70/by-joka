-- ═══════════════════════════════════════════════════════════════════
-- Shrimp House - Complete Database Setup Script
-- شغّل هذا الملف في Supabase SQL Editor مرة واحدة فقط
-- ═══════════════════════════════════════════════════════════════════

-- 1) BRANCHES TABLE
CREATE TABLE IF NOT EXISTS branches (
  id   UUID PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT
);

-- Insert branches with FIXED UUIDs (must match lib/products.ts)
INSERT INTO branches (id, name, city, phone) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'دسوق',        'كفر الشيخ',    '0502234567'),
  ('550e8400-e29b-41d4-a716-446655440002', 'الإسكندرية',  'الإسكندرية',   '0342123456'),
  ('550e8400-e29b-41d4-a716-446655440003', 'القاهرة',     'القاهرة',      '0234567890'),
  ('550e8400-e29b-41d4-a716-446655440004', 'الجيزة',      'الجيزة',       '0235678901')
ON CONFLICT (id) DO NOTHING;


-- 2) CASHIERS TABLE
CREATE TABLE IF NOT EXISTS cashiers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  branch_id     UUID NOT NULL REFERENCES branches(id),
  name          TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Insert default cashiers
-- Password for all: password123
-- Hash = bcrypt of 'password123' with salt 10
-- (اذا حبيت تغير الباسورد، استخدم bcrypt online generator)
INSERT INTO cashiers (email, password_hash, branch_id, name) VALUES
  ('desouk@admin.com', '$2b$10$q7TZArbGtZNmocZl7soP2.89hXz4TPICIwNH8Vl8KKnVyMyrtpmPq', '550e8400-e29b-41d4-a716-446655440001', 'كاشير دسوق'),
  ('alex@admin.com',   '$2b$10$q7TZArbGtZNmocZl7soP2.89hXz4TPICIwNH8Vl8KKnVyMyrtpmPq', '550e8400-e29b-41d4-a716-446655440002', 'كاشير الإسكندرية'),
  ('cairo@admin.com',  '$2b$10$q7TZArbGtZNmocZl7soP2.89hXz4TPICIwNH8Vl8KKnVyMyrtpmPq', '550e8400-e29b-41d4-a716-446655440003', 'كاشير القاهرة'),
  ('giza@admin.com',   '$2b$10$q7TZArbGtZNmocZl7soP2.89hXz4TPICIwNH8Vl8KKnVyMyrtpmPq', '550e8400-e29b-41d4-a716-446655440004', 'كاشير الجيزة')
ON CONFLICT (email) DO NOTHING;


-- 3) ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id        UUID NOT NULL REFERENCES branches(id),
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT NOT NULL,
  customer_email   TEXT,
  customer_address TEXT,
  total_price      DECIMAL(10,2) NOT NULL,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','done','canceled')),
  notes            TEXT,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_branch_id  ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);


-- 4) ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity     INT NOT NULL,
  price        DECIMAL(10,2) NOT NULL,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);


-- 5) ROW LEVEL SECURITY (Optional - disable for simplicity with service role key)
-- ALTER TABLE branches    DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE cashiers    DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders      DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
