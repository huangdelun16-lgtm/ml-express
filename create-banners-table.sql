-- Create banners table
CREATE TABLE IF NOT EXISTS banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  burmese_title TEXT,
  image_url TEXT,
  link_url TEXT,
  bg_color_start TEXT DEFAULT '#3b82f6',
  bg_color_end TEXT DEFAULT '#60a5fa',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to banners"
ON banners FOR SELECT
USING (is_active = true);

-- Allow authenticated admin access (all operations)
CREATE POLICY "Allow authenticated admin access to banners"
ON banners FOR ALL
USING (true) WITH CHECK (true);

