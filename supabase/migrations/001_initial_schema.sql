-- =========================================================
-- SKEMA DATABASE — Influencer Rising Star (Employee Advocacy Sosmed)
-- PT Pegadaian — Kanwil VI Kalimantan (pilot)
-- Dialek: PostgreSQL (Supabase)
--
-- CARA PAKAI:
-- 1. Buka Supabase Dashboard → SQL Editor → New Query
-- 2. Paste seluruh isi file ini
-- 3. Klik Run
-- =========================================================

-- =========================================================
-- MASTER DATA ORGANISASI
-- =========================================================

CREATE TABLE kanwil (
    id              BIGSERIAL PRIMARY KEY,
    kode_kanwil     VARCHAR(20) UNIQUE NOT NULL,
    nama            VARCHAR(150) NOT NULL,
    region          VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE kanwil ENABLE ROW LEVEL SECURITY;

CREATE TABLE cabang (
    id              BIGSERIAL PRIMARY KEY,
    kanwil_id       BIGINT NOT NULL REFERENCES kanwil(id),
    kode_cabang     VARCHAR(20) UNIQUE NOT NULL,
    nama            VARCHAR(150) NOT NULL,
    alamat          TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cabang ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- USER & ROLE
-- =========================================================

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    auth_uid        UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    nip             VARCHAR(30) UNIQUE NOT NULL,
    nama            VARCHAR(150) NOT NULL,
    email           VARCHAR(150),
    no_hp           VARCHAR(30),
    jabatan         VARCHAR(100),
    cabang_id       BIGINT REFERENCES cabang(id),
    kanwil_id       BIGINT REFERENCES kanwil(id),
    role            VARCHAR(30) NOT NULL DEFAULT 'karyawan',
        -- enum-like: karyawan, admin_kanwil, admin_pusat, manajemen
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
        -- active, inactive, suspended
    managed_by      BIGINT REFERENCES users(id),
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE TABLE social_accounts (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform        VARCHAR(30) NOT NULL,
    handle          VARCHAR(150) NOT NULL,
    profile_url     TEXT,
    is_verified     BOOLEAN DEFAULT FALSE,
    verified_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, platform, handle)
);

ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- MASTER DATA POIN / SCORING RULES
-- =========================================================

CREATE TABLE content_types (
    id              BIGSERIAL PRIMARY KEY,
    kode            VARCHAR(30) UNIQUE NOT NULL,
    nama            VARCHAR(150) NOT NULL,
    deskripsi       TEXT
);

ALTER TABLE content_types ENABLE ROW LEVEL SECURITY;

CREATE TABLE point_rules (
    id              BIGSERIAL PRIMARY KEY,
    content_type_id BIGINT NOT NULL REFERENCES content_types(id),
    platform        VARCHAR(30) NOT NULL,
    base_point      INTEGER NOT NULL DEFAULT 0,
    multiplier_rule JSONB,
    valid_from      DATE NOT NULL,
    valid_to        DATE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE point_rules ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- SUBMISSION / POSTINGAN
-- =========================================================

CREATE TABLE posts (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id),
    social_account_id   BIGINT REFERENCES social_accounts(id),
    content_type_id     BIGINT NOT NULL REFERENCES content_types(id),
    platform            VARCHAR(30) NOT NULL,
    post_url            TEXT,
    screenshot_url      TEXT,
    screenshot_hash     VARCHAR(128),
    caption_text        TEXT,
    hashtags            TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',
        -- pending, approved, rejected, revision_requested
    reject_reason       TEXT,
    reviewed_by         BIGINT REFERENCES users(id),
    reviewed_at         TIMESTAMPTZ,
    submitted_at        TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_screenshot_hash ON posts(screenshot_hash);

CREATE TABLE post_engagement_stats (
    id          BIGSERIAL PRIMARY KEY,
    post_id     BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    likes       INTEGER DEFAULT 0,
    comments    INTEGER DEFAULT 0,
    shares      INTEGER DEFAULT 0,
    views       INTEGER DEFAULT 0,
    fetched_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE post_engagement_stats ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- LEDGER POIN (SUMBER KEBENARAN SALDO POIN)
-- =========================================================

CREATE TABLE points_ledger (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    post_id         BIGINT REFERENCES posts(id),
    point_type      VARCHAR(20) NOT NULL DEFAULT 'earn',
        -- earn, bonus, penalty, redemption, adjustment
    points          INTEGER NOT NULL,
    description     TEXT,
    period_label    VARCHAR(20),
    created_by      BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ledger_user ON points_ledger(user_id);
CREATE INDEX idx_ledger_period ON points_ledger(period_label);

-- =========================================================
-- REWARD & REDEMPTION (OPSIONAL / FASE MENDATANG)
-- Tabel disiapkan sebagai referensi desain. TIDAK ADA UI di MVP.
-- =========================================================

CREATE TABLE rewards (
    id              BIGSERIAL PRIMARY KEY,
    nama            VARCHAR(150) NOT NULL,
    deskripsi       TEXT,
    point_cost      INTEGER NOT NULL,
    stok            INTEGER,
    valid_from      DATE,
    valid_to        DATE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

CREATE TABLE redemptions (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    reward_id       BIGINT NOT NULL REFERENCES rewards(id),
    points_spent    INTEGER NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'requested',
        -- requested, approved, rejected, fulfilled
    requested_at    TIMESTAMPTZ DEFAULT NOW(),
    processed_by    BIGINT REFERENCES users(id),
    processed_at    TIMESTAMPTZ
);

ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- LEADERBOARD (SNAPSHOT UNTUK PERFORMA QUERY)
-- =========================================================

CREATE TABLE leaderboard_snapshot (
    id              BIGSERIAL PRIMARY KEY,
    period_label    VARCHAR(20) NOT NULL,
    scope           VARCHAR(20) NOT NULL,
    ref_id          BIGINT NOT NULL,
    total_points    INTEGER NOT NULL,
    rank            INTEGER NOT NULL,
    generated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leaderboard_snapshot ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_leaderboard_period_scope ON leaderboard_snapshot(period_label, scope);

-- =========================================================
-- NOTIFIKASI
-- =========================================================

CREATE TABLE notifications (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    type        VARCHAR(30) NOT NULL,
    message     TEXT NOT NULL,
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- AUDIT LOG (WAJIB UNTUK TRANSPARANSI & ANTI-FRAUD)
-- =========================================================

CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    actor_id        BIGINT REFERENCES users(id),
    action          VARCHAR(50) NOT NULL,
    entity          VARCHAR(50) NOT NULL,
    entity_id       BIGINT NOT NULL,
    detail          JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- ROW LEVEL SECURITY POLICIES
-- =========================================================

-- Helper function: get current user's app profile
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.users WHERE auth_uid = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_kanwil_id()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT kanwil_id FROM public.users WHERE auth_uid = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.users WHERE auth_uid = auth.uid() LIMIT 1;
$$;

-- Helper RPC: Cek apakah user menunggu registrasi perdana (lazy signup)
CREATE OR REPLACE FUNCTION public.check_lazy_registration(p_nip TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE LOWER(nip) = LOWER(TRIM(p_nip)) 
      AND auth_uid IS NULL 
      AND status = 'active'
  );
$$;

-- Helper RPC: Tautkan auth_uid pengguna hasil upload CSV secara aman
CREATE OR REPLACE FUNCTION public.register_uploaded_user(p_nip TEXT, p_auth_uid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.users
  SET auth_uid = p_auth_uid,
      updated_at = NOW()
  WHERE LOWER(nip) = LOWER(TRIM(p_nip))
    AND auth_uid IS NULL
    AND status = 'active';

  RETURN FOUND;
END;
$$;

-- KANWIL: semua authenticated user bisa read
CREATE POLICY "kanwil_select_authenticated" ON kanwil
    FOR SELECT TO authenticated USING (true);

-- CABANG: semua authenticated user bisa read
CREATE POLICY "cabang_select_authenticated" ON cabang
    FOR SELECT TO authenticated USING (true);

-- USERS: karyawan bisa lihat profil sendiri, admin_kanwil bisa lihat semua di wilayahnya
CREATE POLICY "users_select_own" ON users
    FOR SELECT TO authenticated
    USING (
        auth_uid = auth.uid()
        OR public.get_current_user_role() IN ('admin_kanwil', 'admin_pusat', 'manajemen')
    );

CREATE POLICY "users_insert_admin" ON users
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_current_user_role() IN ('admin_kanwil', 'admin_pusat')
    );

CREATE POLICY "users_update_admin" ON users
    FOR UPDATE TO authenticated
    USING (
        auth_uid = auth.uid()
        OR public.get_current_user_role() IN ('admin_kanwil', 'admin_pusat')
    );

-- SOCIAL_ACCOUNTS: user bisa kelola akun sendiri
CREATE POLICY "social_select_own" ON social_accounts
    FOR SELECT TO authenticated
    USING (
        user_id = public.get_current_user_id()
        OR public.get_current_user_role() IN ('admin_kanwil', 'admin_pusat')
    );

CREATE POLICY "social_insert_own" ON social_accounts
    FOR INSERT TO authenticated
    WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "social_update_own" ON social_accounts
    FOR UPDATE TO authenticated
    USING (user_id = public.get_current_user_id());

CREATE POLICY "social_delete_own" ON social_accounts
    FOR DELETE TO authenticated
    USING (user_id = public.get_current_user_id());

-- CONTENT_TYPES: semua authenticated bisa read
CREATE POLICY "content_types_select" ON content_types
    FOR SELECT TO authenticated USING (true);

-- POINT_RULES: semua authenticated bisa read
CREATE POLICY "point_rules_select" ON point_rules
    FOR SELECT TO authenticated USING (true);

-- POSTS: karyawan lihat milik sendiri, admin_kanwil lihat semua di wilayahnya
CREATE POLICY "posts_select" ON posts
    FOR SELECT TO authenticated
    USING (
        user_id = public.get_current_user_id()
        OR public.get_current_user_role() IN ('admin_kanwil', 'admin_pusat', 'manajemen')
    );

CREATE POLICY "posts_insert_own" ON posts
    FOR INSERT TO authenticated
    WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "posts_update_reviewer" ON posts
    FOR UPDATE TO authenticated
    USING (
        user_id = public.get_current_user_id()
        OR public.get_current_user_role() IN ('admin_kanwil', 'admin_pusat')
    );

-- POST_ENGAGEMENT_STATS: follow posts visibility
CREATE POLICY "engagement_select" ON post_engagement_stats
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "engagement_insert" ON post_engagement_stats
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "engagement_update" ON post_engagement_stats
    FOR UPDATE TO authenticated USING (true);

-- POINTS_LEDGER: karyawan lihat poin sendiri, admin lihat semua
CREATE POLICY "ledger_select" ON points_ledger
    FOR SELECT TO authenticated
    USING (
        user_id = public.get_current_user_id()
        OR public.get_current_user_role() IN ('admin_kanwil', 'admin_pusat', 'manajemen')
    );

CREATE POLICY "ledger_insert_own_or_admin" ON points_ledger
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = public.get_current_user_id()
        OR public.get_current_user_role() IN ('admin_kanwil', 'admin_pusat')
    );

-- REWARDS & REDEMPTIONS: read all, insert own (fase mendatang)
CREATE POLICY "rewards_select" ON rewards
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "redemptions_select" ON redemptions
    FOR SELECT TO authenticated
    USING (
        user_id = public.get_current_user_id()
        OR public.get_current_user_role() IN ('admin_kanwil', 'admin_pusat')
    );

-- LEADERBOARD: semua authenticated bisa read
CREATE POLICY "leaderboard_select" ON leaderboard_snapshot
    FOR SELECT TO authenticated USING (true);

-- NOTIFICATIONS: hanya lihat notifikasi sendiri
CREATE POLICY "notifications_select_own" ON notifications
    FOR SELECT TO authenticated
    USING (user_id = public.get_current_user_id());

CREATE POLICY "notifications_update_own" ON notifications
    FOR UPDATE TO authenticated
    USING (user_id = public.get_current_user_id());

-- AUDIT_LOG: hanya admin bisa lihat
CREATE POLICY "audit_select_admin" ON audit_log
    FOR SELECT TO authenticated
    USING (
        public.get_current_user_role() IN ('admin_kanwil', 'admin_pusat', 'manajemen')
    );

CREATE POLICY "audit_insert_authenticated" ON audit_log
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- =========================================================
-- TRIGGER: auto-update updated_at pada tabel users
-- =========================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =========================================================
-- SEED DATA — Pilot Kanwil VI Kalimantan
-- =========================================================

INSERT INTO kanwil (kode_kanwil, nama, region) VALUES
    ('KW-VI', 'Kanwil VI Kalimantan', 'Kalimantan');

INSERT INTO cabang (kanwil_id, kode_cabang, nama) VALUES
    (1, 'BPP-01', 'Balikpapan Kota'),
    (1, 'SMD-01', 'Samarinda A. Yani'),
    (1, 'BTG-01', 'Bontang'),
    (1, 'TRK-01', 'Tarakan');

INSERT INTO content_types (kode, nama, deskripsi) VALUES
    ('repost_resmi', 'Repost konten resmi Pegadaian', 'Membagikan ulang konten resmi dari akun sosial media Pegadaian'),
    ('status_mention', 'Status/story dengan mention @pegadaian', 'Status atau story pribadi yang menyebut/mention akun resmi Pegadaian'),
    ('konten_original', 'Konten original + testimoni', 'Konten foto/video buatan sendiri berisi testimoni atau edukasi produk Pegadaian');

INSERT INTO point_rules (content_type_id, platform, base_point, valid_from) VALUES
    (1, 'semua', 10, CURRENT_DATE),
    (2, 'semua', 15, CURRENT_DATE),
    (3, 'semua', 25, CURRENT_DATE);

-- =========================================================
-- STORAGE BUCKET untuk screenshot submission
-- =========================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'screenshots',
    'screenshots',
    false,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users bisa upload
CREATE POLICY "screenshots_upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'screenshots');

-- Storage policy: authenticated users bisa lihat
CREATE POLICY "screenshots_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'screenshots');
