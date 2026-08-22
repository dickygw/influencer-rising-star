'use server'

import { createClient } from '@/lib/supabase/server'

async function getKaryawanContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('users')
    .select('id, kanwil_id')
    .eq('auth_uid', user.id)
    .single()

  if (!profile) throw new Error('User profile not found')

  return { supabase, userId: profile.id }
}

// Fetch all posts by logged-in employee including points earned
export async function getRiwayatSubmissions() {
  try {
    const { supabase, userId } = await getKaryawanContext()

    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        id,
        platform,
        post_url,
        caption_text,
        hashtags,
        submitted_at,
        status,
        reject_reason,
        content_type:content_type_id (nama),
        points_ledger (points)
      `)
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })

    if (error) throw error

    // Map rows in JS to get clean points value
    const formattedPosts = (posts || []).map((post: any) => {
      const pointsEarned = (post.points_ledger || []).reduce(
        (sum: number, item: any) => sum + item.points,
        0
      )
      return {
        id: post.id,
        platform: post.platform,
        postUrl: post.post_url,
        captionText: post.caption_text,
        hashtags: post.hashtags,
        submittedAt: post.submitted_at,
        status: post.status,
        rejectReason: post.reject_reason,
        contentTypeName: post.content_type?.nama || 'Aktivitas',
        pointsEarned,
      }
    })

    return { success: true, data: formattedPosts }
  } catch (error: any) {
    console.error('Error fetching employee history:', error.message)
    return { success: false, error: 'Terjadi kesalahan sistem. Silakan coba lagi.' }
  }
}

// Fetch user's summary points (total balance)
export async function getPointsSummary() {
  try {
    const { supabase, userId } = await getKaryawanContext()

    const { data: ledger, error } = await supabase
      .from('points_ledger')
      .select('points')
      .eq('user_id', userId)

    if (error) throw error

    const totalBalance = (ledger || []).reduce((sum, item) => sum + item.points, 0)

    return { success: true, totalBalance }
  } catch (error: any) {
    console.error('Error fetching points summary:', error.message)
    return { success: false, error: 'Terjadi kesalahan sistem. Silakan coba lagi.', totalBalance: 0 }
  }
}
