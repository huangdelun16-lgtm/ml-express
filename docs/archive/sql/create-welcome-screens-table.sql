-- 创建欢迎页面配置表
CREATE TABLE IF NOT EXISTS welcome_screens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title_zh TEXT NOT NULL,
  title_en TEXT,
  title_my TEXT,
  description_zh TEXT NOT NULL,
  description_en TEXT,
  description_my TEXT,
  button_text_zh TEXT NOT NULL,
  button_text_en TEXT,
  button_text_my TEXT,
  image_url TEXT, -- 对应 logo-large.png
  bg_color_start TEXT DEFAULT '#b0d3e8',
  bg_color_end TEXT DEFAULT '#7895a3',
  button_color_start TEXT DEFAULT '#ffffff',
  button_color_end TEXT DEFAULT '#f0f9ff',
  countdown INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE welcome_screens ENABLE ROW LEVEL SECURITY;

-- 允许匿名读取
DROP POLICY IF EXISTS "Allow anonymous read access" ON welcome_screens;
CREATE POLICY "Allow anonymous read access" ON welcome_screens
  FOR SELECT USING (true);

-- 允许认证用户（管理员）所有操作
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON welcome_screens;
CREATE POLICY "Allow all access for authenticated users" ON welcome_screens
  FOR ALL USING (auth.role() = 'authenticated');

-- 创建更新触发器
CREATE OR REPLACE FUNCTION update_welcome_screens_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_welcome_screens_updated_at ON welcome_screens;
CREATE TRIGGER update_welcome_screens_updated_at
    BEFORE UPDATE ON welcome_screens
    FOR EACH ROW
    EXECUTE FUNCTION update_welcome_screens_updated_at_column();
