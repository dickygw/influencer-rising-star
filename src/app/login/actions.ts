'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type LoginState = {
  error?: string
  success?: boolean
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

  // Redirect based on role
  if (profile.role === 'admin_kanwil' || profile.role === 'admin_pusat') {
    redirect('/admin')
  } else {
    redirect('/karyawan')
  }
}
