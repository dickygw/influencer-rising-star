import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      redirect('/login')
    }

    // Fetch user role to redirect to appropriate dashboard
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role, status')
      .eq('auth_uid', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Home: Profile not found for authenticated user:', profileError)
      // Sign out auth if profile does not exist to break any potential redirect loops
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
  } catch (error: any) {
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }
    console.error('Home: Unexpected error:', error)
    redirect('/login')
  }
}
