-- =========================================================
-- MIGRATION 008: SINGLE SESSION ENFORCEMENT
-- Memastikan setiap user hanya bisa login di satu device.
-- Saat login dari device baru, sesi device lama otomatis invalid.
-- =========================================================

-- Tambahkan kolom session_token di tabel users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS session_token VARCHAR(64);

-- RPC: Update session token saat login (bypass RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.set_session_token(p_auth_uid UUID, p_token VARCHAR)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.users
  SET session_token = p_token,
      updated_at = NOW()
  WHERE auth_uid = p_auth_uid;
END;
$$;

-- RPC: Ambil session token untuk validasi di middleware
CREATE OR REPLACE FUNCTION public.get_session_token(p_auth_uid UUID)
RETURNS VARCHAR
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT session_token FROM public.users WHERE auth_uid = p_auth_uid LIMIT 1;
$$;
