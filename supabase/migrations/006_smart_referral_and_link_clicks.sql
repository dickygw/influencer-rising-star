-- =========================================================
-- MIGRATION 006: SMART BIO LINK REFERRAL & PELACAK KLIK NASABAH
-- (Pelacakan Konversi Leads per Handle Instagram Karyawan)
-- =========================================================

-- 1. Tabel Pengaturan Kampanye & Destination URL Dinamis
CREATE TABLE IF NOT EXISTS public.campaign_settings (
    id              VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    campaign_name   VARCHAR(150) NOT NULL DEFAULT 'Kampanye Utama IRS 2026',
    destination_url TEXT NOT NULL DEFAULT 'https://www.pegadaian.co.id/produk/tabungan-emas',
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_by      BIGINT REFERENCES users(id)
);

-- Insert row default jika belum ada
INSERT INTO public.campaign_settings (id, campaign_name, destination_url, description)
VALUES (
    'default', 
    'Promo Tabungan Emas Pegadaian', 
    'https://www.pegadaian.co.id/produk/tabungan-emas',
    'Tautan pengalihan utama kampanye nasabah Influencer Rising Star'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Tabel Pencatatan Klik Pengunjung / Calon Nasabah
CREATE TABLE IF NOT EXISTS public.link_clicks (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id) ON DELETE CASCADE,
    handle          VARCHAR(150) NOT NULL,
    campaign_id     VARCHAR(50) DEFAULT 'default',
    destination_url TEXT NOT NULL,
    referrer        TEXT,
    user_agent      TEXT,
    ip_address      VARCHAR(100),
    clicked_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_link_clicks_user ON public.link_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_handle ON public.link_clicks(handle);
CREATE INDEX IF NOT EXISTS idx_link_clicks_time ON public.link_clicks(clicked_at);

-- 3. Tambahkan Kolom Status Bio Link di social_accounts
ALTER TABLE public.social_accounts 
ADD COLUMN IF NOT EXISTS is_bio_link_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bio_link_url TEXT,
ADD COLUMN IF NOT EXISTS bio_link_verified_at TIMESTAMPTZ;

-- 4. Aktifkan RLS dan Policy Akses Publik untuk Pencatatan Klik
ALTER TABLE public.campaign_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;

-- Campaign settings: Publik & Semua role bisa membaca
DROP POLICY IF EXISTS "campaign_settings_select" ON public.campaign_settings;
CREATE POLICY "campaign_settings_select" ON public.campaign_settings
    FOR SELECT TO public
    USING (true);

-- Campaign settings: Hanya admin yang bisa mengupdate
DROP POLICY IF EXISTS "campaign_settings_update" ON public.campaign_settings;
CREATE POLICY "campaign_settings_update" ON public.campaign_settings
    FOR ALL TO authenticated
    USING (public.get_current_user_role() IN ('admin_kanwil', 'admin_pusat'));

-- Link clicks: Publik / Anonim bisa mencatat klik saat redirect
DROP POLICY IF EXISTS "link_clicks_insert" ON public.link_clicks;
CREATE POLICY "link_clicks_insert" ON public.link_clicks
    FOR INSERT TO public
    WITH CHECK (true);

-- Link clicks: Karyawan bisa melihat klik miliknya, Admin bisa melihat semua
DROP POLICY IF EXISTS "link_clicks_select" ON public.link_clicks;
CREATE POLICY "link_clicks_select" ON public.link_clicks
    FOR SELECT TO authenticated
    USING (
        user_id = public.get_current_user_id()
        OR public.get_current_user_role() IN ('admin_kanwil', 'admin_pusat', 'manajemen')
    );
