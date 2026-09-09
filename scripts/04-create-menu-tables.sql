-- ═══════════════════════════════════════════════════════════════════
-- Shrimp House - Menu Tables (Categories & Products)
-- شغّل هذا الملف في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- 1) CATEGORIES TABLE
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,           
  name        TEXT NOT NULL,              
  name_ar     TEXT NOT NULL,              
  icon        TEXT DEFAULT '🍽️',          
  sort_order  INT  DEFAULT 0,             
  is_active   BOOLEAN DEFAULT TRUE,       
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- 2) PRODUCTS TABLE
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id              TEXT PRIMARY KEY,         
  name            TEXT NOT NULL,            
  name_ar         TEXT NOT NULL,            
  description     TEXT DEFAULT '',          
  description_ar  TEXT DEFAULT '',          
  price           DECIMAL(10,2) NOT NULL,   
  image           TEXT DEFAULT '/images/placeholder.jpg', 
  category_id     TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  is_featured     BOOLEAN DEFAULT FALSE,    
  is_best_seller  BOOLEAN DEFAULT FALSE,    
  is_active       BOOLEAN DEFAULT TRUE,     
  sort_order      INT DEFAULT 0,            
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active   ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);

-- ─────────────────────────────────────────────────────────
-- 3) SEED: إدخال التصنيفات
-- ─────────────────────────────────────────────────────────
INSERT INTO categories (id, name, name_ar, icon, sort_order) VALUES
  ('shrimp',  'Shrimp',         'جمبري',         '🦐', 1),
  ('crab',    'Crab',           'كابوريا',        '🦀', 2),
  ('lobster', 'Lobster',        'استاكوزا',       '🦞', 3),
  ('fish',    'Fish',           'سمك',            '🐟', 4),
  ('squid',   'Squid',          'كاليماري',       '🦑', 5),
  ('mixed',   'Mixed Platters', 'أطباق مشكلة',   '🍽️', 6)
ON CONFLICT (id) DO UPDATE SET
  name       = EXCLUDED.name,
  name_ar    = EXCLUDED.name_ar,
  icon       = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- ─────────────────────────────────────────────────────────
-- 4) SEED: إدخال المنتجات
-- ─────────────────────────────────────────────────────────
INSERT INTO products (id, name, name_ar, description, description_ar, price, image, category_id, is_featured, is_best_seller, sort_order) VALUES

  -- Shrimp / جمبري
  ('shrimp-grilled',  'Grilled Shrimp',  'جمبري مشوي',
   'Fresh grilled shrimp with herbs and lemon',
   'جمبري طازج مشوي مع الأعشاب والليمون',
   250, '/images/shrimp-grilled.jpg', 'shrimp', TRUE, TRUE, 1),

  ('shrimp-fried',    'Fried Shrimp',    'جمبري مقلي',
   'Crispy golden fried shrimp',
   'جمبري مقلي ذهبي مقرمش',
   220, '/images/shrimp-fried.jpg', 'shrimp', FALSE, TRUE, 2),

  ('shrimp-spicy',    'Spicy Shrimp',    'جمبري حار',
   'Shrimp in spicy tomato sauce',
   'جمبري بصلصة الطماطم الحارة',
   240, '/images/shrimp-spicy.jpg', 'shrimp', TRUE, FALSE, 3),

  ('shrimp-coconut',  'Coconut Shrimp',  'جمبري جوز الهند',
   'Shrimp coated in coconut and fried',
   'جمبري مغطى بجوز الهند ومقلي',
   260, '/images/shrimp-coconut.jpg', 'shrimp', FALSE, FALSE, 4),

  -- Crab / كابوريا
  ('crab-steamed',    'Steamed Crab',    'كابوريا بالبخار',
   'Fresh steamed crab with garlic butter',
   'كابوريا طازجة بالبخار مع زبدة الثوم',
   350, '/images/crab-steamed.jpg', 'crab', TRUE, TRUE, 1),

  ('crab-fried',      'Fried Crab',      'كابوريا مقلية',
   'Crispy fried soft shell crab',
   'كابوريا قشرة طرية مقلية مقرمشة',
   320, '/images/crab-fried.jpg', 'crab', FALSE, FALSE, 2),

  ('crab-spicy',      'Spicy Crab',      'كابوريا حارة',
   'Crab in spicy Asian sauce',
   'كابوريا بصلصة آسيوية حارة',
   340, '/images/crab-spicy.jpg', 'crab', FALSE, TRUE, 3),

  -- Lobster / استاكوزا
  ('lobster-grilled',    'Grilled Lobster',     'استاكوزا مشوية',
   'Whole lobster grilled with garlic butter',
   'استاكوزا كاملة مشوية مع زبدة الثوم',
   550, '/images/lobster-grilled.jpg', 'lobster', TRUE, TRUE, 1),

  ('lobster-thermidor',  'Lobster Thermidor',   'استاكوزا ثيرميدور',
   'Classic French lobster in creamy sauce',
   'استاكوزا فرنسية كلاسيكية بصلصة كريمية',
   600, '/images/lobster-thermidor.jpg', 'lobster', TRUE, FALSE, 2),

  -- Fish / سمك
  ('fish-grilled-sea-bass',   'Grilled Sea Bass',    'سمك قاروص مشوي',
   'Fresh sea bass grilled to perfection',
   'سمك قاروص طازج مشوي بشكل مثالي',
   280, '/images/fish-sea-bass.jpg', 'fish', FALSE, TRUE, 1),

  ('fish-fried-red-snapper',  'Fried Red Snapper',   'سمك بلطي مقلي',
   'Crispy fried red snapper',
   'سمك بلطي مقلي مقرمش',
   200, '/images/fish-red-snapper.jpg', 'fish', FALSE, FALSE, 2),

  ('fish-sayadeya',           'Fish Sayadeya',       'صيادية سمك',
   'Traditional Egyptian fish with rice',
   'صيادية سمك مصرية تقليدية مع الأرز',
   250, '/images/fish-sayadeya.jpg', 'fish', TRUE, FALSE, 3),

  -- Squid / كاليماري
  ('squid-fried',    'Fried Calamari',  'كاليماري مقلي',
   'Crispy fried squid rings',
   'حلقات كاليماري مقلية مقرمشة',
   180, '/images/squid-fried.jpg', 'squid', FALSE, TRUE, 1),

  ('squid-grilled',  'Grilled Squid',   'كاليماري مشوي',
   'Tender grilled squid with herbs',
   'كاليماري طري مشوي مع الأعشاب',
   200, '/images/squid-grilled.jpg', 'squid', FALSE, FALSE, 2),

  ('squid-stuffed',  'Stuffed Squid',   'كاليماري محشي',
   'Squid stuffed with rice and vegetables',
   'كاليماري محشي بالأرز والخضروات',
   220, '/images/squid-stuffed.jpg', 'squid', TRUE, FALSE, 3),

  -- Mixed Platters / أطباق مشكلة
  ('mixed-seafood-platter',  'Seafood Platter',   'طبق مأكولات بحرية مشكل',
   'Mixed seafood platter with shrimp, fish, and calamari',
   'طبق مأكولات بحرية مشكل مع جمبري وسمك وكاليماري',
   450, '/images/mixed-platter.jpg', 'mixed', TRUE, TRUE, 1),

  ('mixed-grilled-platter',  'Grilled Platter',   'طبق مشويات مشكل',
   'Assorted grilled seafood',
   'مشويات بحرية مشكلة',
   420, '/images/mixed-grilled.jpg', 'mixed', FALSE, TRUE, 2),

  ('mixed-family-platter',   'Family Platter',    'طبق العائلة',
   'Large mixed platter for the whole family',
   'طبق مشكل كبير للعائلة بأكملها',
   800, '/images/mixed-family.jpg', 'mixed', TRUE, FALSE, 3)

ON CONFLICT (id) DO UPDATE SET
  name           = EXCLUDED.name,
  name_ar        = EXCLUDED.name_ar,
  description    = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  price          = EXCLUDED.price,
  image          = EXCLUDED.image,
  category_id    = EXCLUDED.category_id,
  is_featured    = EXCLUDED.is_featured,
  is_best_seller = EXCLUDED.is_best_seller,
  sort_order     = EXCLUDED.sort_order,
  updated_at     = NOW();

-- ─────────────────────────────────────────────────────────
-- 5) Row Level Security - السماح بالقراءة للجميع
-- ─────────────────────────────────────────────────────────
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products   ENABLE ROW LEVEL SECURITY;

-- السماح لأي شخص بقراءة التصنيفات والمنتجات النشطة
CREATE POLICY "Anyone can read active categories"
  ON categories FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Anyone can read active products"
  ON products FOR SELECT
  USING (is_active = TRUE);

-- السماح للـ service_role بكل العمليات (للإدارة)
CREATE POLICY "Service role full access on categories"
  ON categories FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on products"
  ON products FOR ALL
  USING (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════════
-- ✅ انتهى! الآن يمكنك إضافة / تعديل / حذف أي تصنيف أو منتج مباشرة
--    من Supabase Table Editor وسيظهر تلقائياً على الموقع.
-- ═══════════════════════════════════════════════════════════════════
