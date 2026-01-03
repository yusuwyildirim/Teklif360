-- =====================================================
-- TEKLIF360 SUPABASE KURULUM SQL
-- Bu SQL'i Supabase Dashboard > SQL Editor'da çalıştırın
-- =====================================================

-- 1. Proje geçmişi tablosu
CREATE TABLE IF NOT EXISTS project_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  item_count INTEGER DEFAULT 0,
  matched_count INTEGER DEFAULT 0,
  total_amount DECIMAL(15, 2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  data JSONB DEFAULT '[]'::jsonb
);

-- 2. Index'ler (performans için)
CREATE INDEX IF NOT EXISTS idx_project_history_user_id ON project_history(user_id);
CREATE INDEX IF NOT EXISTS idx_project_history_created_at ON project_history(created_at DESC);

-- 3. RLS (Row Level Security) aktif et
ALTER TABLE project_history ENABLE ROW LEVEL SECURITY;

-- 4. RLS Politikaları - Kullanıcılar sadece kendi verilerini görebilir
CREATE POLICY "Users can view own projects" ON project_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON project_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON project_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON project_history
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Updated_at otomatik güncelleme trigger'ı
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_project_history_updated_at
  BEFORE UPDATE ON project_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- KURULUM TAMAMLANDI!
-- Şimdi Authentication > Users'dan kullanıcı ekleyin:
-- Email: f.ylmaz23@outlook.com
-- Password: 12345678
-- =====================================================
