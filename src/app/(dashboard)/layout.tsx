import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from './dashboard-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let profile = null
  let kanwilName = ''

  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      redirect('/login')
    }

    const cookieStore = await cookies()
    const cookieSessionToken = cookieStore.get('irs_session_token')?.value

    const { data: userProfile, error: profileErr } = await supabase
      .from('users')
      .select('id, nip, nama, role, kanwil_id, cabang_id, avatar_url, status, session_token')
      .eq('auth_uid', user.id)
      .single()

    if (profileErr || !userProfile) {
      console.error('Profile not found in DashboardLayout:', profileErr)
      await supabase.auth.signOut().catch(() => {})
      redirect('/login?reason=unregistered')
    }

    if (userProfile.status !== 'active') {
      await supabase.auth.signOut().catch(() => {})
      redirect('/login?reason=inactive')
    }

    // =========================================================================
    // SECURITY: Single Session Enforcement
    // Jika user login dari device lain, token di DB berubah sehingga sesi ini dibatalkan.
    // =========================================================================
    if (cookieSessionToken && userProfile.session_token && cookieSessionToken !== userProfile.session_token) {
      console.warn('[SECURITY] Single session conflict detected for user:', user.id)
      await supabase.auth.signOut().catch(() => {})
      redirect('/login?reason=session_expired')
    }

    profile = userProfile

    // Fetch kanwil name safely
    if (profile.kanwil_id) {
      try {
        const { data: kanwil } = await supabase
          .from('kanwil')
          .select('nama')
          .eq('id', profile.kanwil_id)
          .single()
        kanwilName = kanwil?.nama || ''
      } catch (err) {
        console.error('Error fetching kanwil name:', err)
      }
    }
  } catch (error: any) {
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }
    console.error('Unexpected error in DashboardLayout:', error)
    redirect('/login')
  }

  if (!profile) {
    redirect('/login')
  }

  return (
    <DashboardShell
      user={{
        nama: profile.nama,
        nip: profile.nip,
        role: profile.role,
        kanwilName,
      }}
    >
      {children}
    </DashboardShell>
  )
}
