import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    const cookieStore = await cookies()
    cookieStore.delete('irs_session_token')
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Logout route error:', err?.message || err)
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 })
  }
}
