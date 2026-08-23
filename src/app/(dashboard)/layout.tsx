import { redirect } from 'next/navigation'
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
    .select('id, nip, nama, role, kanwil_id, cabang_id, avatar_url, status')
    .eq('auth_uid', user.id)
    .maybeSingle()

  if (!profile) {
    redirect('/login?reason=unregistered')
  }

  if (profile.status !== 'active') {
    redirect('/login?reason=inactive')
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
