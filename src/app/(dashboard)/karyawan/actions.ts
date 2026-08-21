'use server'

import { createClient } from '@/lib/supabase/server'
import { getPointsSummary } from './riwayat/actions'

async function getKaryawanContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('users')
    .select('id, nama')
    .eq('auth_uid', user.id)
    .single()

  if (!profile) throw new Error('User profile not found')

  return { supabase, userId: profile.id, nama: profile.nama }
}

// Fetch employee landing page summary stats
export async function getKaryawanDashboardSummary() {
  try {
    const { supabase, userId, nama } = await getKaryawanContext()

    // 1. Fetch total points balance
    const pointsRes = await getPointsSummary()
    const totalBalance = pointsRes.success ? pointsRes.totalBalance : 0

    // 2. Fetch daily quota
    // Re-importing directly from submission quota check
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { count: submittedToday } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('submitted_at', todayStart.toISOString())
    
    const quotaRemaining = Math.max(0, 3 - (submittedToday || 0))

    // 3. Count personal submission statistics
    const { data: posts, error } = await supabase
      .from('posts')
      .select('status')
      .eq('user_id', userId)

    if (error) throw error

    const stats = {
      approved: 0,
      rejected: 0,
      pending: 0,
    }

    if (posts) {
      posts.forEach((post) => {
        if (post.status === 'approved') stats.approved++
        else if (post.status === 'rejected') stats.rejected++
        else if (post.status === 'pending') stats.pending++
      })
    }

    return {
      success: true,
      summary: {
        nama,
        totalBalance,
        quotaRemaining,
        stats,
      },
    }
  } catch (error: any) {
    console.error('Error fetching employee dashboard summary:', error.message)
    return { success: false, error: error.message }
  }
}
