import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, status')
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

  if (profile.role === 'admin_kanwil' || profile.role === 'admin_pusat') {
    redirect('/admin')
  } else {
    redirect('/karyawan')
  }
}
