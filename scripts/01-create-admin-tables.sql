-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  city VARCHAR NOT NULL,
  phone VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create cashiers table
CREATE TABLE IF NOT EXISTS cashiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  branch_id UUID NOT NULL REFERENCES branches(id),
  full_name VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  customer_name VARCHAR NOT NULL,
  customer_phone VARCHAR NOT NULL,
  customer_email VARCHAR,
  address VARCHAR NOT NULL,
  payment_method VARCHAR NOT NULL,
  notes TEXT,
  status VARCHAR DEFAULT 'pending',
  total_price DECIMAL NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR NOT NULL,
  product_name VARCHAR NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cashiers_branch_id ON cashiers(branch_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Insert sample branches
INSERT INTO branches (name, city, phone) VALUES
  ('دسوق', 'كفر الشيخ', '0502234567'),
  ('الإسكندرية', 'الإسكندرية', '0342123456'),
  ('القاهرة', 'القاهرة', '0234567890'),
  ('الجيزة', 'الجيزة', '0235678901')
ON CONFLICT DO NOTHING;
