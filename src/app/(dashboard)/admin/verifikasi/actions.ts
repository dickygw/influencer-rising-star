'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

  return { supabase, adminId: profile.id, kanwilId: profile.kanwil_id }
}

// Fetch pending submissions under the Admin's Kanwil
export async function getPendingSubmissions() {
  try {
    const { supabase, kanwilId } = await getAdminContext()

    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        id,
        platform,
        post_url,
        screenshot_url,
        caption_text,
        hashtags,
        submitted_at,
        status,
        user:user_id!inner(id, nama, nip, kanwil_id, cabang:cabang_id (nama)),
        content_type:content_type_id (id, nama, kode)
      `)
      .eq('status', 'pending')
      .eq('user_id.kanwil_id', kanwilId) // Correct inner join column filter
      .order('submitted_at', { ascending: true })

    if (error) throw error

    // Generate signed URLs for private storage screenshots
    const postsWithSignedUrls = await Promise.all(
      (posts || []).map(async (post: any) => {
        if (!post.screenshot_url) return post

        const { data: signedData } = await supabase.storage
          .from('screenshots')
          .createSignedUrl(post.screenshot_url, 3600) // 1 hour expiration

        return {
          ...post,
          screenshot_signed_url: signedData?.signedUrl || null,
        }
      })
    )

    // Filter out posts where user is null (due to different kanwil constraint)
    const filteredPosts = postsWithSignedUrls.filter(post => post.user !== null)

    return { success: true, data: filteredPosts }
  } catch (error: any) {
    console.error('Error fetching pending submissions:', error.message)
    return { success: false, error: 'Terjadi kesalahan sistem. Silakan coba lagi.' }
  }
}

// Approve a submission and award points
export async function approveSubmission(postId: string) {
  try {
    const { supabase, adminId, kanwilId } = await getAdminContext()

    // 1. Fetch post details
    const { data: post, error: fetchErr } = await supabase
      .from('posts')
      .select('id, user_id, content_type_id, platform, status')
      .eq('id', postId)
      .single()

    if (fetchErr || !post) throw new Error('Postingan tidak ditemukan')
    if (post.status !== 'pending') throw new Error('Postingan sudah diproses')

    // SECURITY: Validasi bahwa post milik kanwil yang sama dengan admin
    const { data: postOwner } = await supabase
      .from('users')
      .select('kanwil_id')
      .eq('id', post.user_id)
      .single()

    if (!postOwner || postOwner.kanwil_id !== kanwilId) {
      throw new Error('Akses ditolak: Postingan bukan milik kanwil Anda')
    }

    // 2. Fetch point rules matching content_type
    const { data: rules } = await supabase
      .from('point_rules')
      .select('platform, base_point')
      .eq('content_type_id', post.content_type_id)
      .eq('is_active', true)

    let points = 10 // Fallback default
    if (rules && rules.length > 0) {
      const specificRule = rules.find(r => r.platform === post.platform)
      const fallbackRule = rules.find(r => r.platform === 'semua')
      points = specificRule ? specificRule.base_point : (fallbackRule ? fallbackRule.base_point : 10)
    }

    // Generate dynamic period label (e.g. 2026-Q3)
    const now = new Date()
    const quarter = Math.floor(now.getMonth() / 3) + 1
    const periodLabel = `${now.getFullYear()}-Q${quarter}`

    // 3. Perform atomic updates
    // Update post status
    const { error: postUpdateErr } = await supabase
      .from('posts')
      .update({
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', postId)

    if (postUpdateErr) throw postUpdateErr

    // Insert points ledger
    const { error: ledgerErr } = await supabase.from('points_ledger').insert({
      user_id: post.user_id,
      post_id: post.id,
      point_type: 'earn',
      points,
      description: `Poin disetujui untuk repost/posting sosial media`,
      period_label: periodLabel,
    })

    if (ledgerErr) throw ledgerErr

    // Insert notification
    await supabase.from('notifications').insert({
      user_id: post.user_id,
      type: 'post_approved',
      message: `Submission postingan Anda disetujui! Anda mendapatkan +${points} poin.`,
    })

    // Insert audit log
    await supabase.from('audit_log').insert({
      actor_id: adminId,
      action: 'approve_post',
      entity: 'posts',
      entity_id: parseInt(postId),
      detail: { points, periodLabel },
    })

    revalidatePath('/admin/verifikasi')
    return { success: true }
  } catch (error: any) {
    console.error('Approve error:', error.message)
    return { success: false, error: 'Terjadi kesalahan sistem. Silakan coba lagi.' }
  }
}

// Reject a submission with reason
export async function rejectSubmission(postId: string, rejectReason: string) {
  try {
    const { supabase, adminId, kanwilId } = await getAdminContext()

    if (!rejectReason || rejectReason.trim() === '') {
      return { success: false, error: 'Alasan penolakan wajib diisi' }
    }

    // 1. Fetch post details
    const { data: post, error: fetchErr } = await supabase
      .from('posts')
      .select('id, user_id, status')
      .eq('id', postId)
      .single()

    if (fetchErr || !post) throw new Error('Postingan tidak ditemukan')
    if (post.status !== 'pending') throw new Error('Postingan sudah diproses')

    // SECURITY: Validasi bahwa post milik kanwil yang sama dengan admin
    const { data: postOwner } = await supabase
      .from('users')
      .select('kanwil_id')
      .eq('id', post.user_id)
      .single()

    if (!postOwner || postOwner.kanwil_id !== kanwilId) {
      throw new Error('Akses ditolak: Postingan bukan milik kanwil Anda')
    }

    // 2. Perform updates
    const { error: postUpdateErr } = await supabase
      .from('posts')
      .update({
        status: 'rejected',
        reject_reason: rejectReason.trim(),
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', postId)

    if (postUpdateErr) throw postUpdateErr

    // Insert notification
    await supabase.from('notifications').insert({
      user_id: post.user_id,
      type: 'post_rejected',
      message: `Submission postingan Anda ditolak. Alasan: ${rejectReason.trim()}`,
    })

    // Insert audit log
    await supabase.from('audit_log').insert({
      actor_id: adminId,
      action: 'reject_post',
      entity: 'posts',
      entity_id: parseInt(postId),
      detail: { reason: rejectReason.trim() },
    })

    revalidatePath('/admin/verifikasi')
    return { success: true }
  } catch (error: any) {
    console.error('Reject error:', error.message)
    return { success: false, error: 'Terjadi kesalahan sistem. Silakan coba lagi.' }
  }
}
