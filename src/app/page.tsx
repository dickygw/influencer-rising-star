import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()

  let authUser = null
  try {
    const { data: { user } } = await supabase.auth.getUser()
    authUser = user
  } catch (e) {
    console.error('Home: auth.getUser() failed:', e)
  }

  // redirect() MUST be called outside try/catch
  if (!authUser) {
    redirect('/login')
  }

  let profile = null
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role, status')
      .eq('auth_uid', authUser.id)
      .maybeSingle()

    if (error) {
      console.error('Home: profile query error:', error.message)
    }
    profile = data
  } catch (e) {
    console.error('Home: profile fetch crashed:', e)
  }

  // redirect() calls OUTSIDE try/catch
  if (!profile) {
    redirect('/login?reason=unregistered')
  }

  if (profile.status !== 'active') {
    redirect('/login?reason=inactive')
  }

  if (profile.role === 'admin_kanwil' || profile.role === 'admin_pusat') {
    redirect('/admin')
  } else {
    redirect('/karyawan')
  }
}
