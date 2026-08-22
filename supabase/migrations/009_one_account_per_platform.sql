-- =========================================================
-- MIGRATION 009: 1 AKUN PER MEDIA SOSIAL
-- Membatasi setiap karyawan hanya boleh menautkan maksimal 
-- 1 akun untuk setiap platform media sosial (Instagram, TikTok, Facebook, X).
-- =========================================================

-- Tambahkan Unique Constraint pada pasangan (user_id, platform)
-- Jika user sudah punya akun Instagram, tidak bisa menambah akun Instagram ke-2.
-- Namun masih bisa menambah 1 akun TikTok, 1 akun Facebook, 1 akun X.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'social_accounts_user_platform_unique'
    ) THEN
        ALTER TABLE public.social_accounts 
        ADD CONSTRAINT social_accounts_user_platform_unique UNIQUE (user_id, platform);
    END IF;
END $$;
