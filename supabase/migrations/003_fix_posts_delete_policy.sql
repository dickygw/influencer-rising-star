-- =========================================================
-- FIX: Tambahkan Policy DELETE pada tabel posts
-- (Dibutuhkan untuk mekanisme rollback sistem & pembatalan postingan)
-- =========================================================

DROP POLICY IF EXISTS "posts_delete_own" ON posts;

CREATE POLICY "posts_delete_own" ON posts
    FOR DELETE TO authenticated
    USING (
        user_id = public.get_current_user_id()
        OR public.get_current_user_role() IN ('admin_kanwil', 'admin_pusat')
    );
