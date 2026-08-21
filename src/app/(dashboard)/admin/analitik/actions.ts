'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Helper: Verifikasi bahwa user adalah Admin Kanwil/Pusat yang berhak
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

// Helper untuk mengekstrak shortcode Instagram
function extractInstagramShortcode(url: string): string | null {
  const match = url.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)
  return match ? match[1] : null
}

export type AnalyticsOverview = {
  summary: {
    totalPosts: number
    totalLikes: number
    totalViews: number
    totalComments: number
    totalAdvocates: number
    avgLikesPerPost: number
    lastSyncedAt: string | null
  }
  advocates: Array<{
    id: string
    nama: string
    nip: string
    cabangId: string
    cabangNama: string
    handle: string
    totalPosts: number
    totalLikes: number
    totalViews: number
    totalComments: number
  }>
  topPosts: Array<{
    id: string
    postUrl: string
    captionText: string
    platform: string
    submittedAt: string
    employeeNama: string
    employeeNip: string
    cabangNama: string
    handle: string
    likes: number
    comments: number
    views: number
  }>
  branches: Array<{
    id: string
    nama: string
    totalPosts: number
    totalLikes: number
    totalViews: number
    advocateCount: number
  }>
  cabangList: Array<{
    id: string
    nama: string
  }>
}

// =========================================================================
// FUNGSI: getAnalyticsData
// Kegunaan: Mengambil seluruh data agregasi statistik sosial media wilayah
// =========================================================================
export async function getAnalyticsData(selectedCabangId?: string) {
  try {
    const { supabase, kanwilId } = await getAdminContext()

    // 1. Ambil daftar cabang di Kanwil ini
    const { data: cabangRows, error: cabangErr } = await supabase
      .from('cabang')
      .select('id, nama')
      .eq('kanwil_id', kanwilId)
      .order('nama', { ascending: true })

    if (cabangErr) throw cabangErr

    // 2. Query karyawan beserta postingan approved dan statistiknya
    let userQuery = supabase
      .from('users')
      .select(`
        id,
        nip,
        nama,
        cabang_id,
        cabang:cabang_id (id, nama),
        social_accounts (platform, handle),
        posts:posts!user_id (
          id,
          platform,
          post_url,
          caption_text,
          submitted_at,
          status,
          post_engagement_stats (likes, comments, views, fetched_at)
        )
      `)
      .eq('kanwil_id', kanwilId)
      .eq('role', 'karyawan')

    if (selectedCabangId && selectedCabangId !== 'all') {
      userQuery = userQuery.eq('cabang_id', selectedCabangId)
    }

    const { data: usersData, error: usersErr } = await userQuery

    if (usersErr) throw usersErr

    // 3. Kalkulasi data analitik
    let totalPosts = 0
    let totalLikes = 0
    let totalViews = 0
    let totalComments = 0
    let lastSyncedAt: string | null = null

    const allApprovedPosts: any[] = []
    const advocatesMap = new Map<string, any>()
    const branchStatsMap = new Map<string, { id: string; nama: string; totalPosts: number; totalLikes: number; totalViews: number; advocateIds: Set<string> }>()

    // Inisialisasi map cabang
    ;(cabangRows || []).forEach((c: any) => {
      branchStatsMap.set(c.id.toString(), {
        id: c.id.toString(),
        nama: c.nama,
        totalPosts: 0,
        totalLikes: 0,
        totalViews: 0,
        advocateIds: new Set<string>()
      })
    })

    ;(usersData || []).forEach((user: any) => {
      const userCabangId = user.cabang_id ? user.cabang_id.toString() : 'unknown'
      const userCabangNama = user.cabang?.nama || 'Kantor Wilayah'
      const igAccount = (user.social_accounts || []).find((s: any) => s.platform === 'instagram')
      const handle = igAccount?.handle || '-'

      let userLikes = 0
      let userViews = 0
      let userComments = 0
      let userApprovedPostsCount = 0

      const approvedPosts = (user.posts || []).filter((p: any) => p.status === 'approved')

      approvedPosts.forEach((post: any) => {
        userApprovedPostsCount++
        totalPosts++

        const stats = post.post_engagement_stats || []
        let pLikes = 0
        let pComments = 0
        let pViews = 0

        stats.forEach((st: any) => {
          pLikes += st.likes || 0
          pComments += st.comments || 0
          pViews += st.views || 0
          if (st.fetched_at) {
            if (!lastSyncedAt || new Date(st.fetched_at) > new Date(lastSyncedAt)) {
              lastSyncedAt = st.fetched_at
            }
          }
        })

        userLikes += pLikes
        userViews += pViews
        userComments += pComments

        totalLikes += pLikes
        totalViews += pViews
        totalComments += pComments

        allApprovedPosts.push({
          id: post.id.toString(),
          postUrl: post.post_url,
          captionText: post.caption_text || '',
          platform: post.platform,
          submittedAt: post.submitted_at,
          employeeNama: user.nama,
          employeeNip: user.nip,
          cabangNama: userCabangNama,
          handle,
          likes: pLikes,
          comments: pComments,
          views: pViews
        })
      })

      // Catat advokator jika pernah post
      if (userApprovedPostsCount > 0) {
        advocatesMap.set(user.id.toString(), {
          id: user.id.toString(),
          nama: user.nama,
          nip: user.nip,
          cabangId: userCabangId,
          cabangNama: userCabangNama,
          handle,
          totalPosts: userApprovedPostsCount,
          totalLikes: userLikes,
          totalViews: userViews,
          totalComments: userComments
        })

        if (branchStatsMap.has(userCabangId)) {
          const b = branchStatsMap.get(userCabangId)!
          b.totalPosts += userApprovedPostsCount
          b.totalLikes += userLikes
          b.totalViews += userViews
          b.advocateIds.add(user.id.toString())
        }
      }
    })

    // Sort Top Posts berdasarkan Likes terbanyak lalu Views
    const topPosts = allApprovedPosts
      .sort((a, b) => (b.likes + b.views) - (a.likes + a.views))
      .slice(0, 12)

    // Format data advokator
    const advocates = Array.from(advocatesMap.values())

    // Format data cabang
    const branches = Array.from(branchStatsMap.values()).map(b => ({
      id: b.id,
      nama: b.nama,
      totalPosts: b.totalPosts,
      totalLikes: b.totalLikes,
      totalViews: b.totalViews,
      advocateCount: b.advocateIds.size
    })).sort((a, b) => b.totalLikes - a.totalLikes)

    const avgLikesPerPost = totalPosts > 0 ? Math.round((totalLikes / totalPosts) * 10) / 10 : 0

    return {
      success: true,
      data: {
        summary: {
          totalPosts,
          totalLikes,
          totalViews,
          totalComments,
          totalAdvocates: advocates.length,
          avgLikesPerPost,
          lastSyncedAt
        },
        advocates,
        topPosts,
        branches,
        cabangList: (cabangRows || []).map((c: any) => ({ id: c.id.toString(), nama: c.nama }))
      } as AnalyticsOverview
    }
  } catch (error: any) {
    console.error('Error in getAnalyticsData:', error.message)
    return { success: false, error: error.message }
  }
}

// =========================================================================
// FUNGSI: syncAllKanwilEngagement
// Kegunaan: Sinkronisasi massal (Batch) seluruh postingan karyawan di Kanwil
// =========================================================================
export async function syncAllKanwilEngagement(selectedCabangId?: string) {
  try {
    const { supabase, kanwilId } = await getAdminContext()

    const apifyToken = process.env.APIFY_TOKEN
    if (!apifyToken) {
      return { success: false, error: 'APIFY_TOKEN belum terkonfigurasi di server.' }
    }

    // 1. Ambil seluruh postingan approved di Kanwil ini
    let postQuery = supabase
      .from('posts')
      .select(`
        id,
        post_url,
        user_id,
        users:user_id!inner (
          id,
          kanwil_id,
          cabang_id,
          social_accounts (platform, handle)
        )
      `)
      .eq('platform', 'instagram')
      .eq('status', 'approved')
      .eq('users.kanwil_id', kanwilId)

    if (selectedCabangId && selectedCabangId !== 'all') {
      postQuery = postQuery.eq('users.cabang_id', selectedCabangId)
    }

    const { data: posts, error: postsErr } = await postQuery

    if (postsErr) throw postsErr
    if (!posts || posts.length === 0) {
      return { success: true, message: 'Tidak ada postingan Instagram terverifikasi yang perlu disinkronkan.' }
    }

    const { ApifyClient } = await import('apify-client')
    const client = new ApifyClient({ token: apifyToken })

    // Kumpulkan semua handle dan direct URLs
    const directUrls = Array.from(new Set(posts.map(p => p.post_url?.trim()).filter(Boolean)))
    
    // Kumpulkan username akun yang terkait
    const handles = new Set<string>()
    posts.forEach((p: any) => {
      const igAcc = (p.users?.social_accounts || []).find((s: any) => s.platform === 'instagram')
      if (igAcc?.handle) {
        handles.add(igAcc.handle.replace(/^@/, ''))
      }
    })
    const usernameList = handles.size > 0 ? Array.from(handles) : ['instagram']

    console.log(`Global sync for Kanwil ${kanwilId}: scraping ${directUrls.length} posts...`)

    // Panggil Apify actor dalam 1 batch
    const run = await client.actor('apify/instagram-post-scraper').call({
      username: usernameList,
      directUrls,
      resultsLimit: Math.max(directUrls.length, 10)
    })

    const { items } = await client.dataset(run.defaultDatasetId).listItems()
    console.log(`Global sync Apify returned ${items?.length || 0} items`)

    let updatedCount = 0

    // Loop dan perbarui metrik ke database
    for (const post of posts) {
      try {
        const postShortcode = extractInstagramShortcode(post.post_url)
        const matchedItem = (items || []).find((item: any) => {
          if (postShortcode && (item.shortCode === postShortcode || item.url?.includes(postShortcode))) {
            return true
          }
          if (item.url && post.post_url.includes(item.url)) {
            return true
          }
          return false
        })

        if (matchedItem) {
          const likes = matchedItem.likesCount || 0
          const comments = matchedItem.commentsCount || 0
          const views = matchedItem.videoPlayCount || matchedItem.playCount || matchedItem.videoViewCount || 0

          const { data: existingStat } = await supabase
            .from('post_engagement_stats')
            .select('id')
            .eq('post_id', post.id)
            .maybeSingle()

          if (existingStat) {
            await supabase
              .from('post_engagement_stats')
              .update({
                likes,
                comments,
                views,
                fetched_at: new Date().toISOString()
              })
              .eq('id', existingStat.id)
          } else {
            await supabase
              .from('post_engagement_stats')
              .insert({
                post_id: post.id,
                likes,
                comments,
                views,
                fetched_at: new Date().toISOString()
              })
          }

          updatedCount++
        }
      } catch (err: any) {
        console.error(`Error updating post ${post.id}:`, err.message)
      }
    }

    revalidatePath('/admin/analitik')
    return {
      success: true,
      message: `Sinkronisasi selesai! ${updatedCount} dari ${posts.length} postingan berhasil diperbarui.`
    }
  } catch (error: any) {
    console.error('Error in syncAllKanwilEngagement:', error.message)
    return { success: false, error: error.message }
  }
}
