import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user role to redirect to appropriate dashboard
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('auth_uid', user.id)
    .single()

  if (profile?.role === 'admin_kanwil' || profile?.role === 'admin_pusat') {
    redirect('/admin')
  } else {
    redirect('/karyawan')
  }
}
