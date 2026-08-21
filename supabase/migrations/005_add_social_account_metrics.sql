-- =========================================================
-- MIGRATION 005: TAMBAHKAN KOLOM METRIK PROFIL SOSIAL MEDIA
-- (Untuk kalkulasi Potential Reach, Engagement Rate, dan profil influencer)
-- =========================================================

ALTER TABLE public.social_accounts 
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS profile_pic_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Tambahkan indeks untuk query analitik cepat
CREATE INDEX IF NOT EXISTS idx_social_accounts_followers ON public.social_accounts(followers_count);
CREATE INDEX IF NOT EXISTS idx_social_accounts_user ON public.social_accounts(user_id);
