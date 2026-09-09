-- ═══════════════════════════════════════════════════════════════════
-- Shrimp House - Account & Cart Tables Setup Script
-- شغّل هذا الملف في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1) ACCOUNT TABLE (جدول حسابات العملاء المسجلين عبر جوجل)
CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) CART TABLE (جدول عناصر السلة المرتبطة بحساب العميل)
CREATE TABLE IF NOT EXISTS cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_account_product UNIQUE (account_id, product_id)
);

-- Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_cart_account_id ON cart(account_id);

-- السماح بالوصول الكامل لقراءة وتحديث الحسابات والسلة
ALTER TABLE account DISABLE ROW LEVEL SECURITY;
ALTER TABLE cart DISABLE ROW LEVEL SECURITY;
