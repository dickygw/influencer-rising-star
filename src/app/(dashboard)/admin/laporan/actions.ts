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

// Fetch kanwil-wide stats
export async function getKanwilStats() {
  try {
    const { supabase, kanwilId } = await getAdminContext()

    // 1. Fetch total points given in this kanwil
    const { data: ledger, error: ledgerErr } = await supabase
      .from('points_ledger')
      .select('points, users:user_id!inner(kanwil_id)')
      .eq('users.kanwil_id', kanwilId)

    if (ledgerErr) throw ledgerErr
    const totalPoints = (ledger || []).reduce((sum, item) => sum + item.points, 0)

    // 2. Fetch count of approved posts in this kanwil
    const { count: approvedCount, error: postsErr } = await supabase
      .from('posts')
      .select('id, user:user_id!inner(kanwil_id)', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('user.kanwil_id', kanwilId)

    if (postsErr) throw postsErr

    // 3. Fetch count of active employees in this kanwil
    const { count: activeCount, error: usersErr } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('kanwil_id', kanwilId)
      .eq('role', 'karyawan')
      .eq('status', 'active')

    if (usersErr) throw usersErr

    return {
      success: true,
      stats: {
        totalPoints,
        approvedPosts: approvedCount || 0,
        activeEmployees: activeCount || 0,
      },
    }
  } catch (error: any) {
    console.error('Error fetching kanwil stats:', error.message)
    return { success: false, error: 'Terjadi kesalahan sistem. Silakan coba lagi.' }
  }
}

// Fetch performances of branches under this Kanwil
export async function getBranchPerformance() {
  try {
    const { supabase, kanwilId } = await getAdminContext()

    const { data: cabang, error } = await supabase
      .from('cabang')
      .select(`
        id,
        kode_cabang,
        nama,
        users (
          id,
          posts:posts!user_id (id, status),
          points_ledger:points_ledger!user_id (points)
        )
      `)
      .eq('kanwil_id', kanwilId)

    if (error) throw error

    // Map stats in JS
    const performance = (cabang || []).map((c: any) => {
      let totalPosts = 0
      let totalPoints = 0
      const uniqueParticipants = new Set()

      if (c.users) {
        c.users.forEach((user: any) => {
          // Count total posts and check active participants
          if (user.posts && user.posts.length > 0) {
            totalPosts += user.posts.length
            uniqueParticipants.add(user.id)
          }
          // Sum points
          if (user.points_ledger) {
            user.points_ledger.forEach((item: any) => {
              totalPoints += item.points
            })
          }
        })
      }

      return {
        id: c.id,
        kode: c.kode_cabang,
        nama: c.nama,
        totalPosts,
        totalPoints,
        activeParticipants: uniqueParticipants.size,
      }
    })

    // Sort from highest points descending
    performance.sort((a, b) => b.totalPoints - a.totalPoints)

    return { success: true, data: performance }
  } catch (error: any) {
    console.error('Error fetching branch performance:', error.message)
    return { success: false, error: 'Terjadi kesalahan sistem. Silakan coba lagi.' }
  }
}
