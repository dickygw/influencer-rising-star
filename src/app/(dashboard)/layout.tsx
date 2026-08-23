import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from './dashboard-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, nip, nama, role, kanwil_id, cabang_id, avatar_url, status, session_token')
    .eq('auth_uid', user.id)
    .maybeSingle()

  if (!profile) {
    await supabase.auth.signOut().catch(() => {})
    redirect('/login?reason=unregistered')
  }

  if (profile.status !== 'active') {
    await supabase.auth.signOut().catch(() => {})
    redirect('/login?reason=inactive')
  }

  // =========================================================================
  // SECURITY: Single Session Enforcement
  // Jika user login dari device lain, token di DB berubah sehingga sesi ini dibatalkan.
  // =========================================================================
  const cookieStore = await cookies()
  const cookieSessionToken = cookieStore.get('irs_session_token')?.value
  if (cookieSessionToken && profile.session_token && cookieSessionToken !== profile.session_token) {
    await supabase.auth.signOut().catch(() => {})
    redirect('/login?reason=session_expired')
  }

  let kanwilName = ''
  if (profile.kanwil_id) {
    const { data: kanwil } = await supabase
      .from('kanwil')
      .select('nama')
      .eq('id', profile.kanwil_id)
      .maybeSingle()
    kanwilName = kanwil?.nama || ''
  }

  return (
    <DashboardShell
      user={{
        nama: profile.nama || 'Pengguna',
        nip: profile.nip || '-',
        role: profile.role || 'karyawan',
        kanwilName,
      }}
    >
      {children}
    </DashboardShell>
  )
}
