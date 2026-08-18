'use server'

// =========================================================================
// BERKAS ACTIONS (SUBMISSION KARYAWAN)
// Dokumen ini berisi fungsi-fungsi backend (Server Actions) yang menangani
// pengiriman postingan, verifikasi otomatis (Instagram) dan verifikasi manual (OCR).
// =========================================================================

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type SubmissionFormState = {
  success?: boolean
  error?: string
  quotaRemaining?: number
}

// =========================================================================
// FUNGSI: getContentTypes
// Kegunaan: Mengambil daftar tipe konten (misalnya: Repost Resmi, Konten Original)
//           dari database Supabase untuk ditampilkan pada form dropdown karyawan.
// =========================================================================
export async function getContentTypes() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('content_types')
      .select('id, kode, nama, deskripsi')
      .order('id', { ascending: true })

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    console.error('Error fetching content types:', error.message)
    return { success: false, error: error.message }
  }
}

// =========================================================================
// FUNGSI: getDailyQuota
// Kegunaan: Memeriksa sisa kuota harian milik karyawan yang sedang login.
//           Sesuai peraturan, batas pengajuan maksimal adalah 3 postingan per hari.
// =========================================================================
export async function getDailyQuota() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('User not authenticated')

    // Ambil ID profil pengguna internal berdasarkan UUID auth Supabase
    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_uid', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

    // Cari postingan yang dibuat hari ini sejak jam 00:00:00
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { count, error } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .gte('submitted_at', todayStart.toISOString())

    if (error) throw error

    const submittedToday = count || 0
    const quotaRemaining = Math.max(0, 3 - submittedToday) // Hitung sisa kuota dari batas maksimal 3

    return { success: true, quotaRemaining, submittedToday }
  } catch (error: any) {
    console.error('Error checking quota:', error.message)
    return { success: false, error: error.message, quotaRemaining: 0 }
  }
}

// =========================================================================
// FUNGSI: scrapeInstagramPost
// Kegunaan: Mengambil data metrik (likes, comments, views) & teks caption dari
//           Instagram secara live menggunakan Apify Scraper di backend.
// =========================================================================
export async function scrapeInstagramPost(postUrl: string, expectedHandle: string) {
  const apifyToken = process.env.APIFY_TOKEN

  // 1. JALUR PRODUKSI: Mengaktifkan pemanggilan ke Aktor Apify
  if (apifyToken) {
    try {
      console.log('Running Apify Instagram Post Scraper...')
      const { ApifyClient } = await import('apify-client')
      const client = new ApifyClient({ token: apifyToken })

      // Jalankan actor instagram-post-scraper dengan format input wajib
      const run = await client.actor('apify/instagram-post-scraper').call({
        username: [expectedHandle.replace(/^@/, '')],
        directUrls: [postUrl.trim()],
        resultsLimit: 1
      })

      const { items } = await client.dataset(run.defaultDatasetId).listItems()
      const postData = items[0]

      if (!postData) {
        return { success: false, error: 'Postingan Instagram tidak ditemukan. Pastikan akun tidak di-private dan link benar.' }
      }

      const ownerUsername = postData.ownerUsername || ''
      const caption = postData.caption || ''
      const likes = postData.likesCount || 0
      const comments = postData.commentsCount || 0
      const views = postData.playCount || postData.videoViewCount || 0

      return {
        success: true,
        data: {
          ownerUsername,
          caption,
          likes,
          comments,
          views
        }
      }
    } catch (err: any) {
      console.error('Apify scraping failed:', err.message)
      // JIKA DI PRODUKSI TOKEN HABIS: Hentikan proses dan beri tahu pengguna
      return { success: false, error: 'Apify Token Habis / Tidak Valid' }
    }
  }

  // 2. JALUR PENGEMBANGAN LOKAL (MOCK MODE): Aktif otomatis bila APIFY_TOKEN kosong di .env.local
  console.log('Using Dynamic Mock Scraper Mode...')
  
  // Tunda 1.5 detik untuk menyimulasikan loading jaringan
  await new Promise((resolve) => setTimeout(resolve, 1500))

  if (postUrl.includes('invalid-handle')) {
    return {
      success: false,
      error: `Verifikasi Gagal: Akun pemilik postingan tidak cocok dengan handle terdaftar Anda (@${expectedHandle}).`
    }
  }

  if (postUrl.includes('no-hashtag')) {
    return {
      success: false,
      error: 'Verifikasi Gagal: Postingan Anda tidak mengandung hashtag wajib #IRS2026.'
    }
  }

  // Ambil parameter likes & comments dinamis dari URL (contoh: ?likes=100&comments=10)
  let likes = Math.floor(Math.random() * 100) + 20
  let comments = Math.floor(Math.random() * 20) + 2
  let views = 0

  try {
    const urlObj = new URL(postUrl)
    const likesParam = urlObj.searchParams.get('likes')
    const commentsParam = urlObj.searchParams.get('comments')
    const viewsParam = urlObj.searchParams.get('views')
    
    if (likesParam) likes = parseInt(likesParam)
    if (commentsParam) comments = parseInt(commentsParam)
    if (viewsParam) views = parseInt(viewsParam)
  } catch (e) {
    // Abaikan jika parsing URL gagal
  }

  return {
    success: true,
    data: {
      ownerUsername: expectedHandle,
      caption: 'Membantu menyebarkan literasi keuangan syariah bersama Pegadaian! #IRS2026 #AdvokasiBUMN',
      likes,
      comments,
      views
    }
  }
}

// =========================================================================
// FUNGSI: verifyScreenshotWithTesseract
// Kegunaan: Mengekstrak teks dari gambar screenshot secara lokal di server
//           menggunakan mesin Tesseract.js OCR (100% Offline & Gratis).
// =========================================================================
export async function verifyScreenshotWithTesseract(
  imageBuffer: Buffer,
  expectedHandle: string
) {
  console.log('Running local Tesseract OCR on screenshot buffer...')
  try {
    const { createWorker } = await import('tesseract.js')
    const path = await import('path')
    const langPath = path.join(process.cwd(), 'tessdata')

    // Inisialisasi Tesseract dengan memuat model bahasa lokal di folder tessdata
    const worker = await createWorker('eng', 1, {
      langPath: langPath,
      cachePath: langPath,
    })
    const ret = await worker.recognize(imageBuffer)
    await worker.terminate()

    const text = ret.data.text || ''
    console.log('Extracted OCR Text length:', text.trim().length)
    console.log('OCR Output Text:', text)

    const cleanText = text.toLowerCase()
    const cleanHandle = expectedHandle.toLowerCase().replace(/^@/, '')
    const cleanHashtag = '#irs2026'

    // Cek keberadaan username terdaftar & hashtag wajib di teks gambar
    const usernameMatches = cleanText.includes(cleanHandle)
    const hashtagFound = cleanText.includes(cleanHashtag)

    let reason = 'Tangkapan layar berhasil divalidasi oleh mesin OCR lokal.'
    if (!usernameMatches && !hashtagFound) {
      reason = `Username @${expectedHandle} dan hashtag wajib #IRS2026 tidak terdeteksi.`
    } else if (!usernameMatches) {
      reason = `Username @${expectedHandle} tidak terdeteksi di gambar.`
    } else if (!hashtagFound) {
      reason = `Hashtag wajib #IRS2026 tidak terdeteksi di gambar.`
    }

    return {
      isSocialMediaScreenshot: text.trim().length > 5, // Menguji apakah ada teks yang terbaca (bukan foto kosong/meja kerja)
      usernameMatches,
      hashtagFound,
      reason,
      text
    }
  } catch (err: any) {
    console.error('Tesseract OCR failed:', err.message)
    throw new Error(`Mesin verifikasi lokal (OCR) gagal menganalisis gambar: ${err.message}`)
  }
}


// =========================================================================
// FUNGSI: submitPost
// Kegunaan: Fungsi utama ketika Karyawan menekan tombol "Kirim Sekarang" di form.
//           Fungsi ini menangani verifikasi kuota harian, validasi link Instagram (Auto),
//           serta pemindaian gambar screenshot dengan mesin OCR lokal (Manual).
// =========================================================================
export async function submitPost(formData: FormData): Promise<SubmissionFormState> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Sesi habis. Silakan login kembali.' }

    // Ambil data profil karyawan berdasarkan UUID login
    const { data: profile } = await supabase
      .from('users')
      .select('id, nama, kanwil_id')
      .eq('auth_uid', user.id)
      .single()

    if (!profile) return { error: 'Profil karyawan tidak ditemukan.' }

    // 1. Verifikasi Batas Kuota Harian (Maksimal 3 pengajuan per hari)
    const quotaRes = await getDailyQuota()
    if (!quotaRes.success) return { error: 'Gagal mengecek kuota harian.' }
    if (quotaRes.quotaRemaining <= 0) {
      return { error: 'Batas harian tercapai. Anda hanya bisa mengirimkan maksimal 3 submission per hari.' }
    }

    // Tangkap input dari formulir web
    const platform = formData.get('platform') as string
    const contentTypeId = formData.get('contentTypeId') as string
    const postUrl = formData.get('postUrl') as string
    const captionText = formData.get('captionText') as string
    const hashtags = formData.get('hashtags') as string
    const verifyMethod = formData.get('verifyMethod') as string || 'manual'

    if (!platform || !contentTypeId || !postUrl) {
      return { error: 'Field wajib (Platform, Jenis Konten, Link Postingan) harus diisi.' }
    }

    const trimmedUrl = postUrl.trim()
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return { error: 'Format link postingan tidak valid. Pastikan diawali dengan http:// atau https://' }
    }

    // =========================================================================
    // JALUR A: METODE VERIFIKASI OTOMATIS (Instagram Scraping)
    // =========================================================================
    if (verifyMethod === 'auto') {
      if (platform !== 'instagram') {
        return { error: 'Verifikasi Otomatis saat ini baru tersedia untuk platform Instagram.' }
      }

      // Pastikan karyawan sudah mendaftarkan akun Instagram mereka
      const { data: socialAccount, error: saErr } = await supabase
        .from('social_accounts')
        .select('id, handle')
        .eq('user_id', profile.id)
        .eq('platform', 'instagram')
        .maybeSingle()

      if (saErr || !socialAccount) {
        return { error: 'Anda harus mendaftarkan akun Instagram Anda di menu Akun Sosmed terlebih dahulu sebelum bisa menggunakan Verifikasi Otomatis.' }
      }

      // Panggil scraping ke Instagram via Apify
      const scrapRes = await scrapeInstagramPost(trimmedUrl, socialAccount.handle)
      if (!scrapRes.success || !scrapRes.data) {
        return { error: scrapRes.error || 'Gagal melakukan verifikasi otomatis.' }
      }

      const { ownerUsername, caption, likes, comments, views } = scrapRes.data as {
        ownerUsername: string
        caption: string
        likes: number
        comments: number
        views: number
      }

      // Validasi kepemilikan postingan (Username pencocokan)
      if (ownerUsername.toLowerCase() !== socialAccount.handle.toLowerCase()) {
        return { 
          error: `Verifikasi Gagal: Postingan ini diunggah oleh akun @${ownerUsername}, bukan akun Instagram terdaftar Anda (@${socialAccount.handle}).` 
        }
      }

      // Validasi hashtag wajib #IRS2026
      if (!caption.toLowerCase().includes('#irs2026')) {
        return { 
          error: 'Verifikasi Gagal: Postingan Anda tidak mengandung hashtag wajib #IRS2026.' 
        }
      }

      // Validasi duplikasi link postingan agar tidak bisa diklaim berulang
      const { count: dupCount } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('post_url', trimmedUrl)

      if (dupCount && dupCount > 0) {
        return { error: 'Verifikasi Gagal: Link postingan ini sudah pernah diajukan oleh pengguna lain.' }
      }

      // Ambil aturan perolehan poin dasar untuk kategori konten terpilih
      const { data: rules } = await supabase
        .from('point_rules')
        .select('platform, base_point')
        .eq('content_type_id', parseInt(contentTypeId))
        .eq('is_active', true)

      let basePoints = 10
      if (rules && rules.length > 0) {
        const specificRule = rules.find(r => r.platform === 'instagram')
        const fallbackRule = rules.find(r => r.platform === 'semua')
        basePoints = specificRule ? specificRule.base_point : (fallbackRule ? fallbackRule.base_point : 10)
      }

      const totalEarnedPoints = basePoints

      // Tentukan label periode kuartal (misal: 2026-Q3)
      const now = new Date()
      const quarter = Math.floor(now.getMonth() / 3) + 1
      const periodLabel = `${now.getFullYear()}-Q${quarter}`

      // Simpan data postingan ke tabel 'posts' dengan status otomatis 'approved'
      const { data: newPost, error: dbErr } = await supabase
        .from('posts')
        .insert({
          user_id: profile.id,
          social_account_id: socialAccount.id,
          content_type_id: parseInt(contentTypeId),
          platform: 'instagram',
          post_url: trimmedUrl,
          screenshot_url: null,
          caption_text: caption,
          hashtags: '#IRS2026',
          status: 'approved',
          reviewed_by: null,
          reviewed_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (dbErr || !newPost) {
        console.error('Auto verify DB Insert error:', dbErr?.message)
        return { error: 'Gagal menyimpan data verifikasi postingan.' }
      }

      // Simpan metrik interaksi (likes, comments, views) awal
      const { error: statsErr } = await supabase.from('post_engagement_stats').insert({
        post_id: newPost.id,
        likes,
        comments,
        shares: 0,
        views
      })

      if (statsErr) {
        console.error('Auto verify Stats insert error:', statsErr.message)
        await supabase.from('posts').delete().eq('id', newPost.id)
        return { error: `Gagal menyimpan statistik postingan: ${statsErr.message}` }
      }

      // Kreditkan poin langsung ke ledger akuntansi poin karyawan
      const { error: ledgerErr } = await supabase.from('points_ledger').insert({
        user_id: profile.id,
        post_id: newPost.id,
        point_type: 'earn',
        points: totalEarnedPoints,
        description: `Poin otomatis disetujui untuk postingan Instagram (@${socialAccount.handle})`,
        period_label: periodLabel,
      })

      if (ledgerErr) {
        console.error('Auto verify Ledger insert error:', ledgerErr.message)
        await supabase.from('posts').delete().eq('id', newPost.id)
        return { error: `Gagal menambahkan poin otomatis (RLS Policy Error): ${ledgerErr.message}. Harap jalankan SQL Policy yang diberikan.` }
      }

      // Kirim notifikasi sukses ke dasbor karyawan
      await supabase.from('notifications').insert({
        user_id: profile.id,
        type: 'post_approved',
        message: `Postingan Instagram Anda berhasil diverifikasi secara otomatis! Anda mendapatkan +${totalEarnedPoints} poin. 🎉`,
      })

      // Catat transaksi di Audit Log demi transparansi
      await supabase.from('audit_log').insert({
        actor_id: profile.id,
        action: 'auto_approve_post',
        entity: 'posts',
        entity_id: newPost.id,
        detail: { points: totalEarnedPoints, handle: socialAccount.handle, likes, comments, views },
      })

      revalidatePath('/karyawan/submission')
      return { success: true, quotaRemaining: quotaRes.quotaRemaining - 1 }
    }

    // =========================================================================
    // JALUR B: METODE VERIFIKASI MANUAL (Pemindaian Screenshot menggunakan OCR Lokal)
    // =========================================================================
    const screenshotFile = formData.get('screenshot') as File
    if (!screenshotFile) {
      return { error: 'Wajib mengunggah bukti screenshot untuk Verifikasi Manual.' }
    }

    // Validasi Keamanan Berkas: Tipe MIME & Batasan Ukuran (Maks 5MB)
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedMimeTypes.includes(screenshotFile.type)) {
      return { error: 'Format gambar tidak didukung. Harap unggah format JPG, PNG, atau WebP.' }
    }
    if (screenshotFile.size > 5 * 1024 * 1024) {
      return { error: 'Ukuran file screenshot terlalu besar (maksimal 5MB).' }
    }

    // Siapkan nama file unik untuk diunggah ke storage
    const rawExtension = screenshotFile.name.split('.').pop()?.toLowerCase() || 'png'
    const fileExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(rawExtension) ? rawExtension : 'png'
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExtension}`
    const filePath = `${profile.id}/${fileName}`

    const arrayBuffer = await screenshotFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Ambil data akun sosmed karyawan terdaftar
    const { data: socialAccount, error: saErr } = await supabase
      .from('social_accounts')
      .select('id, handle')
      .eq('user_id', profile.id)
      .eq('platform', platform)
      .maybeSingle()

    if (saErr || !socialAccount) {
      return { error: `Anda harus mendaftarkan akun ${platform} Anda di menu Akun Sosmed terlebih dahulu sebelum bisa menggunakan Verifikasi Manual.` }
    }

    // Jalankan engine OCR lokal pada buffer gambar
    let isApprovedByOCR = false
    let ocrReason = ''
    try {
      const ocrResult = await verifyScreenshotWithTesseract(buffer, socialAccount.handle)
      if (!ocrResult.isSocialMediaScreenshot) {
        return { error: `Verifikasi Gambar Gagal: Gambar tidak mengandung teks tangkapan layar yang valid (OCR membaca teks kosong). Detail: ${ocrResult.reason}` }
      }
      if (!ocrResult.usernameMatches) {
        return { error: `Verifikasi Gambar Gagal: Username pemilik akun di gambar tidak cocok dengan akun terdaftar Anda (@${socialAccount.handle}). Detail: ${ocrResult.reason}` }
      }
      if (!ocrResult.hashtagFound) {
        return { error: `Verifikasi Gambar Gagal: Hashtag wajib #IRS2026 tidak terdeteksi pada gambar screenshot. Detail: ${ocrResult.reason}` }
      }
      isApprovedByOCR = true
      ocrReason = ocrResult.reason
    } catch (ocrErr: any) {
      console.error('Local OCR verification error, fallback to pending review:', ocrErr.message)
      isApprovedByOCR = false
      ocrReason = `Verifikasi OCR error: ${ocrErr.message}. Dikirim ke antrean review manual admin.`
    }

    // Unggah gambar ke Bucket Supabase Storage 'screenshots'
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('screenshots')
      .upload(filePath, buffer, {
        contentType: screenshotFile.type,
        upsert: true,
      })

    if (uploadErr) {
      console.error('Storage upload error:', uploadErr)
      return { error: 'Gagal mengunggah gambar bukti screenshot.' }
    }

    const screenshotUrl = uploadData?.path
    const finalStatus = isApprovedByOCR ? 'approved' : 'pending'

    // Buat entri pengajuan postingan baru di database
    const { data: newPost, error: dbErr } = await supabase
      .from('posts')
      .insert({
        user_id: profile.id,
        social_account_id: socialAccount.id,
        content_type_id: parseInt(contentTypeId),
        platform,
        post_url: postUrl.trim(),
        screenshot_url: screenshotUrl,
        caption_text: verifyMethod === 'manual' && isApprovedByOCR ? `Screenshot diverifikasi oleh mesin OCR lokal: ${ocrReason}` : null,
        hashtags: '#IRS2026',
        status: finalStatus,
        reviewed_by: null,
        reviewed_at: finalStatus === 'approved' ? new Date().toISOString() : null,
      })
      .select('id')
      .single()

    if (dbErr || !newPost) {
      console.error('DB Insert error:', dbErr?.message)
      await supabase.storage.from('screenshots').remove([filePath])
      return { error: 'Gagal menyimpan data submission.' }
    }

    // Simpan metrik engagement kosong (karena berupa manual upload)
    await supabase.from('post_engagement_stats').insert({
      post_id: newPost.id,
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0
    })

    // Jika OCR berhasil memvalidasi otomatis, kreditkan poin saat ini juga!
    if (finalStatus === 'approved') {
      const { data: rules } = await supabase
        .from('point_rules')
        .select('platform, base_point')
        .eq('content_type_id', parseInt(contentTypeId))
        .eq('is_active', true)

      let basePoints = 10
      if (rules && rules.length > 0) {
        const specificRule = rules.find(r => r.platform === platform)
        const fallbackRule = rules.find(r => r.platform === 'semua')
        basePoints = specificRule ? specificRule.base_point : (fallbackRule ? fallbackRule.base_point : 10)
      }

      const now = new Date()
      const quarter = Math.floor(now.getMonth() / 3) + 1
      const periodLabel = `${now.getFullYear()}-Q${quarter}`

      const { error: ledgerErr } = await supabase.from('points_ledger').insert({
        user_id: profile.id,
        post_id: newPost.id,
        point_type: 'earn',
        points: basePoints,
        description: `Poin otomatis disetujui lewat verifikasi AI screenshot (@${socialAccount.handle})`,
        period_label: periodLabel,
      })

      if (ledgerErr) {
        console.error('AI approved ledger write error:', ledgerErr.message)
        await supabase.from('posts').delete().eq('id', newPost.id)
        await supabase.storage.from('screenshots').remove([filePath])
        return { error: 'Gagal mengkreditkan poin otomatis setelah verifikasi AI.' }
      }

      // Kirim notifikasi sukses ke karyawan
      await supabase.from('notifications').insert({
        user_id: profile.id,
        type: 'post_approved',
        message: `Bukti screenshot postingan Anda sukses divalidasi oleh AI! Anda mendapatkan +${basePoints} poin. 🤖🎉`,
      })
    } else {
      // Jika dialihkan ke manual (pending), kirim notifikasi ke Admin Kanwil terkait
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('kanwil_id', profile.kanwil_id)
        .eq('role', 'admin_kanwil')
        .eq('status', 'active')

      if (admins && admins.length > 0) {
        const adminNotifications = admins.map((admin: any) => ({
          user_id: admin.id,
          type: 'post_submitted',
          message: `${profile.nama} mengirimkan postingan baru untuk verifikasi manual admin (AI Fallback).`,
        }))
        await supabase.from('notifications').insert(adminNotifications)
      }
    }

    revalidatePath('/karyawan/submission')
    return { success: true, quotaRemaining: quotaRes.quotaRemaining - 1 }
  } catch (error: any) {
    console.error('Submission error:', error.message)
    return { error: error.message || 'Terjadi kesalahan sistem.' }
  }
}

