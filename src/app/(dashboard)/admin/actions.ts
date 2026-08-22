'use server'

import { createClient } from '@/lib/supabase/server'

async function getAdminContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('users')
    .select('id, kanwil_id, role')
    .eq('auth_uid', user.id)
    .single()

  if (!profile || (profile.role !== 'admin_kanwil' && profile.role !== 'admin_pusat')) {
    throw new Error('Unauthorized role')
  }

  return { supabase, kanwilId: profile.kanwil_id }
}

// Fetch Admin Kanwil dashboard summary metrics
export async function getAdminDashboardSummary() {
  try {
    const { supabase, kanwilId } = await getAdminContext()

    // 1. Count pending submissions
    const { count: pendingCount, error: pendingErr } = await supabase
      .from('posts')
      .select('id, user:user_id!inner(kanwil_id)', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('user.kanwil_id', kanwilId)

    if (pendingErr) throw pendingErr

    // 2. Count total registered employees
    const { count: employeeCount, error: empErr } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('kanwil_id', kanwilId)
      .eq('role', 'karyawan')

    if (empErr) throw empErr

    // 3. Get 3 latest submissions in this kanwil
    const { data: recentPosts, error: postsErr } = await supabase
      .from('posts')
      .select(`
        id,
        platform,
        submitted_at,
        status,
        user:user_id!inner(id, nama, nip, kanwil_id),
        content_type:content_type_id (nama)
      `)
      .eq('user.kanwil_id', kanwilId)
      .order('submitted_at', { ascending: false })
      .limit(3)

    if (postsErr) throw postsErr

    return {
      success: true,
      summary: {
        pendingCount: pendingCount || 0,
        employeeCount: employeeCount || 0,
        recentPosts: recentPosts || [],
      },
    }
  } catch (error: any) {
    console.error('Error fetching admin dashboard summary:', error.message)
    return { success: false, error: 'Terjadi kesalahan sistem. Silakan coba lagi.' }
  }
}
