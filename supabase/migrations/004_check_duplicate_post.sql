-- =========================================================
-- MIGRATION 004: FUNGSI CEK DUPLIKASI POSTINGAN LINTAS PENGGUNA
-- (Mengatasi RLS Supabase agar pengecekan link tidak lolos jika disubmit user berbeda)
-- =========================================================

CREATE OR REPLACE FUNCTION public.is_post_url_duplicate(p_url TEXT, p_shortcode TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INT;
BEGIN
  -- 1. Cek kecocokan exact URL (case-insensitive & trimmed)
  -- 2. Cek kecocokan shortcode jika disediakan
  SELECT COUNT(*) INTO v_count
  FROM public.posts
  WHERE 
    LOWER(TRIM(post_url)) = LOWER(TRIM(p_url))
    OR (
      p_shortcode IS NOT NULL 
      AND LENGTH(TRIM(p_shortcode)) > 0 
      AND post_url ILIKE '%' || TRIM(p_shortcode) || '%'
    );
    
  RETURN (v_count > 0);
END;
$$;
