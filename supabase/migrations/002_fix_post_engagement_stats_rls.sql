-- =========================================================
-- FIX: Strict Row Level Security (RLS) Policy untuk post_engagement_stats
-- =========================================================

-- Pastikan RLS aktif pada tabel post_engagement_stats
ALTER TABLE IF EXISTS post_engagement_stats ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada bentrok
DROP POLICY IF EXISTS "engagement_select" ON post_engagement_stats;
DROP POLICY IF EXISTS "engagement_insert" ON post_engagement_stats;
DROP POLICY IF EXISTS "engagement_update" ON post_engagement_stats;
DROP POLICY IF EXISTS "engagement_delete" ON post_engagement_stats;

-- 1. Izin SELECT: Semua user terautentikasi bisa membaca statistik
CREATE POLICY "engagement_select" ON post_engagement_stats
    FOR SELECT TO authenticated
    USING (true);

-- 2. Izin INSERT KETAT: Karyawan HANYA bisa menyimpan statistik untuk postingan miliknya sendiri (atau jika Admin)
CREATE POLICY "engagement_insert" ON post_engagement_stats
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_engagement_stats.post_id
            AND (
                posts.user_id = public.get_current_user_id()
                OR public.get_current_user_role() IN ('admin_kanwil', 'admin_pusat')
            )
        )
    );

-- 3. Izin UPDATE KETAT: Hanya pemilik postingan atau Admin yang bisa memperbarui metrik statistik
CREATE POLICY "engagement_update" ON post_engagement_stats
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_engagement_stats.post_id
            AND (
                posts.user_id = public.get_current_user_id()
                OR public.get_current_user_role() IN ('admin_kanwil', 'admin_pusat')
            )
        )
    );
