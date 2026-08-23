'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export type LoginState = {
  error?: string
  success?: boolean
}

// =========================================================================
// SECURITY: Rate limiter sederhana untuk mencegah brute force attack
// Membatasi 5 percobaan login per NIP dalam 15 menit.
// =========================================================================
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 menit

function checkRateLimit(nip: string): { allowed: boolean; retryAfterSec?: number } {
  const key = nip.toLowerCase().trim()
  const now = Date.now()
  const record = loginAttempts.get(key)

  if (!record || now > record.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true }
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((record.resetAt - now) / 1000)
    return { allowed: false, retryAfterSec }
  }

  record.count++
  return { allowed: true }
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const supabase = await createClient()

  const nip = formData.get('nip') as string
  const password = formData.get('password') as string

  if (!nip || !password) {
    return { error: 'NIP dan password harus diisi.' }
  }

  // SECURITY: Rate limiting check
  const rateCheck = checkRateLimit(nip)
  if (!rateCheck.allowed) {
    return { error: `Terlalu banyak percobaan login. Silakan coba lagi dalam ${rateCheck.retryAfterSec} detik.` }
  }

  // 1. Check if the user exists in database but has no auth_uid (lazy registration check via RPC to bypass guest RLS block)
  const { data: isLazy, error: rpcCheckErr } = await supabase.rpc('check_lazy_registration', {
    p_nip: nip.trim()
  })

  if (rpcCheckErr) {
    console.error('RPC check_lazy_registration error:', rpcCheckErr.message)
  }

  if (isLazy) {
    const email = `${nip.toLowerCase().trim()}@irs.pegadaian.internal`
    
    // Register the user on the fly in Supabase Auth
    const { data: authData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpErr) {
      console.error('Lazy registration signUp error:', signUpErr.message)
      return { error: 'Gagal meregistrasi akun perdana Anda. Silakan hubungi Admin.' }
    }

    const authUid = authData.user?.id
    if (authUid) {
      // Call RPC to securely link the auth_uid bypassing RLS
      const { data: success, error: rpcErr } = await supabase.rpc('register_uploaded_user', {
        p_nip: nip.trim(),
        p_auth_uid: authUid,
      })

      if (rpcErr || !success) {
        console.error('Lazy registration RPC error:', rpcErr)
        return { error: 'Gagal menautkan akun dengan profil database.' }
      }
    }
  }

  // Map NIP to internal email format for Supabase Auth
  const email = `${nip.toLowerCase().trim()}@irs.pegadaian.internal`

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: 'NIP atau password salah. Silakan coba lagi.' }
  }

  // Fetch user role for redirect
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Terjadi kesalahan. Silakan coba lagi.' }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, status')
    .eq('auth_uid', user.id)
    .single()

  if (!profile) {
    // Auth user exists but no profile in users table
    await supabase.auth.signOut()
    return { error: 'Akun Anda belum terdaftar di sistem. Hubungi Admin Kanwil.' }
  }

  if (profile.status !== 'active') {
    await supabase.auth.signOut()
    return { error: 'Akun Anda tidak aktif. Hubungi Admin Kanwil.' }
  }

  // =========================================================================
  // SECURITY: Single Session Enforcement
  // Generate token unik, simpan ke DB, dan set sebagai cookie.
  // Jika user login dari device lain, token berubah → sesi lama invalid.
  // =========================================================================
  try {
    const sessionToken = crypto.randomUUID() + '-' + Date.now().toString(36)
    await supabase.rpc('set_session_token', {
      p_auth_uid: user.id,
      p_token: sessionToken,
    })

    const cookieStore = await cookies()
    cookieStore.set('irs_session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    })
  } catch (sessionErr) {
    console.warn('Optional session token setup warning:', sessionErr)
  }

  // Redirect based on role
  if (profile.role === 'admin_kanwil' || profile.role === 'admin_pusat') {
    redirect('/admin')
  } else {
    redirect('/karyawan')
  }
}
