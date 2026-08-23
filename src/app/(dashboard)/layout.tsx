import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from './dashboard-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Step 1: Create Supabase client and get auth user
  const supabase = await createClient()

  let authUser = null
  try {
    const { data: { user } } = await supabase.auth.getUser()
    authUser = user
  } catch (e) {
    console.error('DashboardLayout: auth.getUser() failed:', e)
  }

  // redirect() must be called OUTSIDE try/catch — it throws internally
  if (!authUser) {
    redirect('/login')
  }

  // Step 2: Fetch user profile
  let profile = null
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, nip, nama, role, kanwil_id, cabang_id, avatar_url, status')
      .eq('auth_uid', authUser.id)
      .maybeSingle()

    if (error) {
      console.error('DashboardLayout: profile query error:', error.message)
    }
    profile = data
  } catch (e) {
    console.error('DashboardLayout: profile fetch crashed:', e)
  }

  // redirect() calls OUTSIDE try/catch
  if (!profile) {
    // Don't call signOut here — it causes header conflicts with redirect
    redirect('/login?reason=unregistered')
  }

  if (profile.status !== 'active') {
    redirect('/login?reason=inactive')
  }

  // Step 3: Fetch kanwil name (optional, non-critical)
  let kanwilName = ''
  try {
    if (profile.kanwil_id) {
      const { data: kanwil } = await supabase
        .from('kanwil')
        .select('nama')
        .eq('id', profile.kanwil_id)
        .maybeSingle()
      kanwilName = kanwil?.nama || ''
    }
  } catch (e) {
    console.error('DashboardLayout: kanwil fetch error:', e)
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
