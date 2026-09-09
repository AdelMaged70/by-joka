-- Insert sample branches
INSERT INTO branches (name, city, phone) VALUES
  ('دسوق', 'كفر الشيخ', '0502234567'),
  ('الإسكندرية', 'الإسكندرية', '0342123456'),
  ('القاهرة', 'القاهرة', '0234567890'),
  ('الجيزة', 'الجيزة', '0235678901')
ON CONFLICT (id) DO NOTHING;
