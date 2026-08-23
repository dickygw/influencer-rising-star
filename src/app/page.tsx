import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'


export default async function Home() {
  try {
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
  } catch (error) {
    // Re-throw Next.js redirect errors (they use thrown responses internally)
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }
    // For any other error (Supabase unreachable, etc.), redirect to login
    redirect('/login')
  }
}
