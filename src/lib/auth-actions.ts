'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// =========================================================================
// SHARED AUTH ACTION: Logout User & Hapus Session Token Cookie
// =========================================================================
export async function logoutUser() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    const cookieStore = await cookies()
    cookieStore.delete('irs_session_token')
    return { success: true }
  } catch (err: any) {
    console.error('Logout error in auth-actions:', err?.message || err)
    return { success: false }
  }
}
