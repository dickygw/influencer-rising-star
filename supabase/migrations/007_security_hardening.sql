-- =========================================================
-- MIGRATION 007: SECURITY HARDENING — RLS POLICY FIXES
-- Memperbaiki celah keamanan pada Row Level Security policies.
-- =========================================================

-- =========================================================
-- FIX #3: Tambahkan INSERT policy pada tabel notifications
-- Sebelumnya tidak ada INSERT policy, sehingga siapa pun dengan
-- anon_key bisa menyisipkan notifikasi palsu ke user mana pun.
-- =========================================================

DROP POLICY IF EXISTS "notifications_insert_restricted" ON notifications;

CREATE POLICY "notifications_insert_restricted" ON notifications
    FOR INSERT TO authenticated
    WITH CHECK (
        -- Karyawan hanya bisa insert notifikasi ke diri sendiri
        user_id = public.get_current_user_id()
        -- Admin bisa mengirim notifikasi ke siapa pun di kanwilnya
        OR public.get_current_user_role() IN ('admin_kanwil', 'admin_pusat')
    );

-- =========================================================
-- FIX #4: Perbaiki policy INSERT & UPDATE pada post_engagement_stats
-- Sebelumnya terbuka lebar (WITH CHECK (true) / USING (true)),
-- sehingga karyawan bisa memalsukan statistik engagement post orang lain.
-- =========================================================

-- Drop policy lama & policy baru jika sudah ada (idempotent)
DROP POLICY IF EXISTS "engagement_insert" ON post_engagement_stats;
DROP POLICY IF EXISTS "engagement_update" ON post_engagement_stats;
DROP POLICY IF EXISTS "engagement_insert_restricted" ON post_engagement_stats;
DROP POLICY IF EXISTS "engagement_update_restricted" ON post_engagement_stats;

-- Policy INSERT: hanya pemilik post atau admin yang bisa menambahkan stats
CREATE POLICY "engagement_insert_restricted" ON post_engagement_stats
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.id = post_engagement_stats.post_id 
              AND posts.user_id = public.get_current_user_id()
        )
        OR public.get_current_user_role() IN ('admin_kanwil', 'admin_pusat')
    );

-- Policy UPDATE: hanya admin yang bisa mengubah statistik
CREATE POLICY "engagement_update_restricted" ON post_engagement_stats
    FOR UPDATE TO authenticated
    USING (
        public.get_current_user_role() IN ('admin_kanwil', 'admin_pusat')
    );
