'use server'

// =========================================================================
// BERKAS ACTIONS (SUBMISSION KARYAWAN)
// Dokumen ini berisi fungsi-fungsi backend (Server Actions) yang menangani
// pengiriman postingan, verifikasi otomatis (Instagram + Gemini Vision),
// serta verifikasi manual (OCR Tesseract + Gemini Vision).
// =========================================================================

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { analyzeContentWithGeminiVision } from '@/lib/gemini'

export type SubmissionFormState = {
  success?: boolean
  error?: string
  quotaRemaining?: number
}

// Helper: Normalisasi username/handle media sosial
function cleanHandle(handle: string | null | undefined): string {
  if (!handle) return ''
  return handle.trim().toLowerCase().replace(/^@+/, '')
}

// Helper: Ekstraksi shortcode unik Instagram dari URL
function extractInstagramShortcode(url: string): string | null {
  const match = url.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)
  return match ? match[1] : null
}

// Helper: Normalisasi URL postingan ke bentuk kanonikal (menghapus query string seperti ?igsh=...)
function normalizePostUrl(rawUrl: string): { normalizedUrl: string; shortcode: string | null } {
  const shortcode = extractInstagramShortcode(rawUrl)
  if (shortcode) {
    if (rawUrl.includes('/reel/')) {
      return { normalizedUrl: `https://www.instagram.com/reel/${shortcode}/`, shortcode }
    }
    return { normalizedUrl: `https://www.instagram.com/p/${shortcode}/`, shortcode }
  }
  try {
    const u = new URL(rawUrl.trim())
    const clean = `${u.origin}${u.pathname.replace(/\/+$/, '')}/`
    return { normalizedUrl: clean, shortcode: null }
  } catch {
    return { normalizedUrl: rawUrl.trim(), shortcode: null }
  }
}

// Daftar kata kunci resmi & produk PT Pegadaian
const PEGADAIAN_KEYWORDS = [
  'pegadaian',
  'the gade',
  'galeri 24',
  'galeri24',
  'sahabat pegadaian',
  'tabungan emas',
  'gadai',
  'cicil emas',
  'kur syariah',
  'mulia',
  'arrum',
  'bumn',
  'emas batangan',
  'investasi emas',
  'pembiayaan',
  'irs2026',
]

// Helper: Cek apakah teks memuat minimal satu kata kunci kontekstual Pegadaian
function hasPegadaianKeywords(text: string): boolean {
  if (!text) return false
  const clean = text.toLowerCase()
  return PEGADAIAN_KEYWORDS.some(kw => clean.includes(kw))
}

// =========================================================================
// FUNGSI: getContentTypes
// Kegunaan: Mengambil daftar tipe konten dari database Supabase
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
    const quotaRemaining = Math.max(0, 3 - submittedToday)

    return { success: true, quotaRemaining, submittedToday }
  } catch (error: any) {
    console.error('Error checking quota:', error.message)
    return { success: false, error: error.message, quotaRemaining: 0 }
  }
}

// =========================================================================
// FUNGSI: scrapeInstagramPost
// Kegunaan: Mengambil data metrik, teks caption, dan URL gambar postingan dari
//           Instagram secara live menggunakan Apify Scraper di backend.
// =========================================================================
export async function scrapeInstagramPost(postUrl: string, expectedHandle: string) {
  const apifyToken = process.env.APIFY_TOKEN
  const targetShortcode = extractInstagramShortcode(postUrl)
  const cleanExpected = cleanHandle(expectedHandle)

  // 1. JALUR PRODUKSI: Mengaktifkan pemanggilan ke Aktor Apify
  if (apifyToken) {
    try {
      console.log('Running Apify Instagram Post Scraper for URL:', postUrl)
      const { ApifyClient } = await import('apify-client')
      const client = new ApifyClient({ token: apifyToken })

      // Panggil scraper dengan handle akun terdaftar dan directUrls spesifik
      const run = await client.actor('apify/instagram-post-scraper').call({
        username: [cleanExpected],
        directUrls: [postUrl.trim()],
        resultsLimit: 10,
      })

      const { items } = await client.dataset(run.defaultDatasetId).listItems()
      console.log(`Apify returned ${items?.length || 0} items`)

      // Cari item yang shortcode-nya cocok secara spesifik
      const postData = (items || []).find((item: any) => {
        if (targetShortcode && (item.shortCode === targetShortcode || item.url?.includes(targetShortcode))) {
          return true
        }
        if (item.url && postUrl.includes(item.url)) {
          return true
        }
        return false
      })

      // JANGAN PERNAH fallback ke items[0] jika shortcode tidak cocok!
      if (!postData) {
        return {
          success: false,
          error: `Postingan Instagram tidak ditemukan di akun @${cleanExpected}. Pastikan link postingan benar, akun Instagram tidak di-private, dan postingan diunggah dari akun Anda.`,
        }
      }

      // Ambil username pemilik dari berbagai field Apify schema
      const anyPost = postData as any
      const rawOwner =
        anyPost.ownerUsername ||
        anyPost.owner?.username ||
        anyPost.user?.username ||
        anyPost.author?.username ||
        ''
      const ownerUsername = cleanHandle(rawOwner)

      if (!ownerUsername) {
        return {
          success: false,
          error:
            'Sistem tidak dapat membaca username pemilik postingan dari Instagram secara live. Harap gunakan opsi Verifikasi Manual (Upload Screenshot Bukti).',
        }
      }

      const caption = (anyPost.caption as string) || ''
      const likes = (anyPost.likesCount as number) || 0
      const comments = (anyPost.commentsCount as number) || 0
      const views =
        (anyPost.videoPlayCount as number) ||
        (anyPost.playCount as number) ||
        (anyPost.videoViewCount as number) ||
        0

      const imageUrl =
        anyPost.displayUrl ||
        anyPost.thumbnailUrl ||
        (Array.isArray(anyPost.images) && anyPost.images[0]) ||
        anyPost.videoThumbnailUrl ||
        anyPost.previewUrl ||
        null

      return {
        success: true,
        data: {
          ownerUsername,
          caption,
          likes,
          comments,
          views,
          imageUrl,
          shortCode: postData.shortCode || targetShortcode,
        },
      }
    } catch (err: any) {
      console.error('Apify scraping failed:', err.message)
      return {
        success: false,
        error: `Layanan Verifikasi Otomatis tidak dapat mengakses link Instagram secara live (${err.message}). Harap gunakan fitur Verifikasi Manual (Upload Bukti Screenshot).`,
      }
    }
  }

  // 2. JALUR PENGEMBANGAN LOKAL (MOCK MODE):
  // Menyimulasikan scraper secara akurat tanpa membypass validasi akun
  console.log('Using Dynamic Mock Scraper Mode...')
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Deteksi uji coba link milik akun lain
  if (
    postUrl.includes('invalid-handle') ||
    postUrl.includes('other-user') ||
    postUrl.includes('azrben') && cleanExpected !== 'azrben'
  ) {
    return {
      success: true,
      data: {
        ownerUsername: 'azrben',
        caption: 'Membantu menyebarkan literasi keuangan bersama Pegadaian! #IRS2026',
        likes: 50,
        comments: 5,
        views: 120,
        imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
      },
    }
  }

  if (postUrl.includes('no-pegadaian') || postUrl.includes('random-image')) {
    return {
      success: true,
      data: {
        ownerUsername: cleanExpected,
        caption: 'Makan siang enak di resto favorit hari ini! #IRS2026 #Kuliner',
        likes: 25,
        comments: 2,
        views: 50,
        imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
      },
    }
  }

  if (postUrl.includes('no-hashtag')) {
    return {
      success: true,
      data: {
        ownerUsername: cleanExpected,
        caption: 'Promo diskon Tabungan Emas Pegadaian hingga 50%!',
        likes: 80,
        comments: 10,
        views: 200,
        imageUrl: 'https://mcvkrxhiuihrtecgajvx.supabase.co/storage/v1/object/public/public_assets/pegadaian_sample.png',
      },
    }
  }

  return {
    success: true,
    data: {
      ownerUsername: cleanExpected,
      caption: 'Investasi aman masa depan dengan Tabungan Emas di PT Pegadaian! #IRS2026 #AdvokasiBUMN',
      likes: Math.floor(Math.random() * 80) + 20,
      comments: Math.floor(Math.random() * 15) + 2,
      views: 150,
      imageUrl: null,
    },
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
    if (typeof process === 'undefined' || typeof process.cwd !== 'function') {
      return {
        success: false,
        isValid: false,
        extractedText: '',
        reason: 'Lingkungan Edge aktif, delegasi otomatis ke Gemini Vision.',
      }
    }

    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('eng', 1)
    const ret = await worker.recognize(imageBuffer)
    await worker.terminate()

    const text = ret.data.text || ''
    console.log('Extracted OCR Text length:', text.trim().length)

    const cleanText = text.toLowerCase()
    const cleanExpected = cleanHandle(expectedHandle)
    const cleanHashtag = '#irs2026'

    // Cek keberadaan username terdaftar & hashtag wajib di teks gambar
    const usernameMatches = cleanText.includes(cleanExpected)
    const hashtagFound = cleanText.includes(cleanHashtag)
    const hasPegadaianBrand = hasPegadaianKeywords(cleanText)

    let reason = 'Tangkapan layar berhasil divalidasi oleh mesin OCR lokal.'
    if (!usernameMatches && !hashtagFound) {
      reason = `Username @${expectedHandle} dan hashtag wajib #IRS2026 tidak terdeteksi.`
    } else if (!usernameMatches) {
      reason = `Username @${expectedHandle} tidak terdeteksi di gambar.`
    } else if (!hashtagFound) {
      reason = `Hashtag wajib #IRS2026 tidak terdeteksi di gambar.`
    }

    return {
      isSocialMediaScreenshot: text.trim().length > 5,
      usernameMatches,
      hashtagFound,
      hasPegadaianBrand,
      reason,
      text,
    }
  } catch (err: any) {
    console.error('Tesseract OCR failed:', err.message)
    throw new Error(`Mesin verifikasi lokal (OCR) gagal menganalisis gambar: ${err.message}`)
  }
}

// =========================================================================
// FUNGSI: submitPost
// Kegunaan: Fungsi utama ketika Karyawan menekan tombol submit.
//           Menangani validasi kuota, verifikasi kepemilikan akun,
//           pencegahan duplikasi lintas pengguna, serta pemindaian AI Vision.
// =========================================================================
export async function submitPost(formData: FormData): Promise<SubmissionFormState> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Sesi habis. Silakan login kembali.' }

    // Ambil data profil karyawan
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
    const verifyMethod = (formData.get('verifyMethod') as string) || 'manual'

    if (!platform || !contentTypeId || !postUrl) {
      return { error: 'Field wajib (Platform, Jenis Konten, Link Postingan) harus diisi.' }
    }

    const trimmedUrl = postUrl.trim()
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return { error: 'Format link postingan tidak valid. Pastikan diawali dengan http:// atau https://' }
    }

    // 2. Normalisasi URL & Ekstraksi Shortcode Instagram
    const { normalizedUrl, shortcode } = normalizePostUrl(trimmedUrl)

    // 3. VALIDASI DUPLIKASI GLOBAL (Lintas Semua Pengguna)
    // Mencegah user B mengklaim link postingan yang sudah diajukan oleh user A
    try {
      const { data: isDupRpc, error: rpcErr } = await supabase.rpc('is_post_url_duplicate', {
        p_url: normalizedUrl,
        p_shortcode: shortcode || '',
      })

      if (!rpcErr && isDupRpc === true) {
        return {
          error: `Verifikasi Gagal: Link postingan ini (kode: ${shortcode || normalizedUrl}) sudah pernah diajukan di sistem oleh pengguna lain.`,
        }
      }
    } catch (dupErr) {
      console.warn('RPC duplicate check warning:', dupErr)
    }

    // Fallback query kecocokan URL
    const { count: dupCount } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('post_url', normalizedUrl)

    if (dupCount && dupCount > 0) {
      return { error: 'Verifikasi Gagal: Link postingan ini sudah pernah diajukan sebelumnya di sistem.' }
    }

    // =========================================================================
    // JALUR A: METODE VERIFIKASI OTOMATIS (Instagram Scraping + Gemini Vision)
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
        return {
          error:
            'Anda harus mendaftarkan akun Instagram Anda di menu Akun Sosmed terlebih dahulu sebelum bisa menggunakan Verifikasi Otomatis.',
        }
      }

      const cleanExpected = cleanHandle(socialAccount.handle)

      // Panggil scraping ke Instagram secara live
      const scrapRes = await scrapeInstagramPost(normalizedUrl, socialAccount.handle)
      if (!scrapRes.success || !scrapRes.data) {
        return { error: scrapRes.error || 'Gagal melakukan verifikasi otomatis.' }
      }

      const { ownerUsername, caption, likes, comments, views, imageUrl } = scrapRes.data as {
        ownerUsername: string
        caption: string
        likes: number
        comments: number
        views: number
        imageUrl: string | null
      }

      // 4. VALIDASI KETAT KEPEMILIKAN AKUN
      const cleanActual = cleanHandle(ownerUsername)
      console.log(`Verifying Account Ownership: Expected=@${cleanExpected} vs Scraped=@${cleanActual}`)

      if (!cleanActual || cleanActual !== cleanExpected) {
        return {
          error: `Verifikasi Gagal: Postingan ini diunggah oleh akun @${cleanActual || 'tidak dikenal'}, bukan akun Instagram terdaftar Anda (@${cleanExpected}).`,
        }
      }

      // 5. VALIDASI HASHTAG WAJIB #IRS2026
      if (!caption.toLowerCase().includes('#irs2026')) {
        return {
          error: 'Verifikasi Gagal: Postingan Anda tidak memuat hashtag wajib #IRS2026.',
        }
      }

      // 6. VALIDASI MULTIMODAL AI VISION (Google Gemini Vision API)
      let aiValidationResult = {
        isValidPegadaianContent: true,
        confidence: 1.0,
        detectedElements: [] as string[],
        reason: 'Lulus verifikasi teks kontekstual Pegadaian.',
      }

      if (imageUrl) {
        console.log('Running Google Gemini Vision on Instagram image URL:', imageUrl)
        const geminiRes = await analyzeContentWithGeminiVision({ url: imageUrl }, caption)
        aiValidationResult = geminiRes

        console.log('Gemini Vision Result:', JSON.stringify(geminiRes))

        if (!geminiRes.isValidPegadaianContent && geminiRes.confidence >= 0.7) {
          return {
            error: `Verifikasi Gagal (AI Vision): Gambar atau konten yang diposting terdeteksi BUKAN merupakan materi promosi/flyer/produk resmi PT Pegadaian. Alasan AI: ${geminiRes.reason}`,
          }
        }
      } else {
        const hasBrandKeyword = hasPegadaianKeywords(caption)
        if (!hasBrandKeyword) {
          return {
            error:
              'Verifikasi Gagal: Caption postingan Anda tidak memuat kata kunci resmi atau produk PT Pegadaian (seperti Tabungan Emas, Gadai, KUR Syariah, Cicil Emas, dll).',
          }
        }
      }

      // 7. AMBIL ATURAN POIN
      const { data: rules } = await supabase
        .from('point_rules')
        .select('platform, base_point')
        .eq('content_type_id', parseInt(contentTypeId))
        .eq('is_active', true)

      let basePoints = 10
      if (rules && rules.length > 0) {
        const specificRule = rules.find((r) => r.platform === 'instagram')
        const fallbackRule = rules.find((r) => r.platform === 'semua')
        basePoints = specificRule ? specificRule.base_point : fallbackRule ? fallbackRule.base_point : 10
      }

      const totalEarnedPoints = basePoints
      const now = new Date()
      const quarter = Math.floor(now.getMonth() / 3) + 1
      const periodLabel = `${now.getFullYear()}-Q${quarter}`

      // 8. SIMPAN DATA POSTINGAN DENGAN STATUS 'APPROVED'
      const { data: newPost, error: dbErr } = await supabase
        .from('posts')
        .insert({
          user_id: profile.id,
          social_account_id: socialAccount.id,
          content_type_id: parseInt(contentTypeId),
          platform: 'instagram',
          post_url: normalizedUrl,
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

      // 9. SIMPAN METRIK ENGAGEMENT
      const { error: statsErr } = await supabase.from('post_engagement_stats').insert({
        post_id: newPost.id,
        likes,
        comments,
        shares: 0,
        views,
      })

      if (statsErr) {
        console.error('Auto verify Stats insert error:', statsErr.message)
        await supabase.from('posts').delete().eq('id', newPost.id)
        return { error: `Gagal menyimpan statistik postingan: ${statsErr.message}` }
      }

      // 10. KREDITKAN POIN KE POINTS_LEDGER
      const { error: ledgerErr } = await supabase.from('points_ledger').insert({
        user_id: profile.id,
        post_id: newPost.id,
        point_type: 'earn',
        points: totalEarnedPoints,
        description: `Poin otomatis disetujui untuk postingan Instagram (@${cleanExpected})`,
        period_label: periodLabel,
      })

      if (ledgerErr) {
        console.error('Auto verify Ledger insert error:', ledgerErr.message)
        await supabase.from('posts').delete().eq('id', newPost.id)
        return { error: `Gagal menambahkan poin otomatis: ${ledgerErr.message}` }
      }

      // 11. NOTIFIKASI SUKSES KE KARYAWAN
      await supabase.from('notifications').insert({
        user_id: profile.id,
        type: 'post_approved',
        message: `Postingan Instagram Anda (@${cleanExpected}) berhasil diverifikasi otomatis oleh AI! Anda mendapatkan +${totalEarnedPoints} poin. 🎉`,
      })

      // 12. AUDIT LOG DENGAN DETAIL AI VISION
      await supabase.from('audit_log').insert({
        actor_id: profile.id,
        action: 'auto_approve_post',
        entity: 'posts',
        entity_id: newPost.id,
        detail: {
          points: totalEarnedPoints,
          handle: cleanExpected,
          likes,
          comments,
          views,
          aiVision: {
            confidence: aiValidationResult.confidence,
            detectedElements: aiValidationResult.detectedElements,
            reason: aiValidationResult.reason,
          },
        },
      })

      revalidatePath('/karyawan/submission')
      return { success: true, quotaRemaining: quotaRes.quotaRemaining - 1 }
    }

    // =========================================================================
    // JALUR B: METODE VERIFIKASI MANUAL (Upload Screenshot + OCR & Gemini AI)
    // =========================================================================
    const screenshotFile = formData.get('screenshot') as File
    if (!screenshotFile) {
      return { error: 'Wajib mengunggah bukti screenshot untuk Verifikasi Manual.' }
    }

    // Validasi Tipe & Ukuran File (Maks 5MB)
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedMimeTypes.includes(screenshotFile.type)) {
      return { error: 'Format gambar tidak didukung. Harap unggah format JPG, PNG, atau WebP.' }
    }
    if (screenshotFile.size > 5 * 1024 * 1024) {
      return { error: 'Ukuran file screenshot terlalu besar (maksimal 5MB).' }
    }

    const rawExtension = screenshotFile.name.split('.').pop()?.toLowerCase() || 'png'
    const fileExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(rawExtension) ? rawExtension : 'png'
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExtension}`
    const filePath = `${profile.id}/${fileName}`

    const arrayBuffer = await screenshotFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Ambil data akun sosmed karyawan
    const { data: socialAccount, error: saErr } = await supabase
      .from('social_accounts')
      .select('id, handle')
      .eq('user_id', profile.id)
      .eq('platform', platform)
      .maybeSingle()

    if (saErr || !socialAccount) {
      return {
        error: `Anda harus mendaftarkan akun ${platform} Anda di menu Akun Sosmed terlebih dahulu sebelum bisa menggunakan Verifikasi Manual.`,
      }
    }

    const cleanExpected = cleanHandle(socialAccount.handle)

    // 1. Eksekusi OCR Lokal
    let isApprovedByOCR = false
    let ocrReason = ''
    try {
      const ocrResult = await verifyScreenshotWithTesseract(buffer, cleanExpected)
      if (!ocrResult.isSocialMediaScreenshot) {
        return {
          error: `Verifikasi Gambar Gagal: Gambar tidak mengandung teks tangkapan layar yang valid. Detail: ${ocrResult.reason}`,
        }
      }
      if (!ocrResult.usernameMatches) {
        return {
          error: `Verifikasi Gambar Gagal: Username pemilik akun di gambar tidak cocok dengan akun terdaftar Anda (@${cleanExpected}). Detail: ${ocrResult.reason}`,
        }
      }
      if (!ocrResult.hashtagFound) {
        return {
          error: `Verifikasi Gambar Gagal: Hashtag wajib #IRS2026 tidak terdeteksi pada gambar screenshot. Detail: ${ocrResult.reason}`,
        }
      }
      isApprovedByOCR = true
      ocrReason = ocrResult.reason
    } catch (ocrErr: any) {
      console.error('Local OCR verification error, fallback to pending review:', ocrErr.message)
      isApprovedByOCR = false
      ocrReason = `Verifikasi OCR dialihkan ke antrean review manual admin: ${ocrErr.message}`
    }

    // 2. Eksekusi Analisis Tambahan Menggunakan Gemini Vision
    console.log('Running Gemini Vision on screenshot buffer...')
    const geminiScreenshotRes = await analyzeContentWithGeminiVision(
      { buffer, mimeType: screenshotFile.type },
      captionText
    )
    console.log('Gemini Screenshot Result:', JSON.stringify(geminiScreenshotRes))

    if (!geminiScreenshotRes.isValidPegadaianContent && geminiScreenshotRes.confidence >= 0.75) {
      return {
        error: `Verifikasi Gambar Gagal (AI Vision): Tangkapan layar terdeteksi bukan merupakan materi promosi/produk resmi PT Pegadaian. Alasan: ${geminiScreenshotRes.reason}`,
      }
    }

    // 3. Unggah gambar ke Bucket Supabase Storage 'screenshots'
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
    const finalStatus = isApprovedByOCR && geminiScreenshotRes.isValidPegadaianContent ? 'approved' : 'pending'

    // 4. Buat entri postingan baru
    const { data: newPost, error: dbErr } = await supabase
      .from('posts')
      .insert({
        user_id: profile.id,
        social_account_id: socialAccount.id,
        content_type_id: parseInt(contentTypeId),
        platform,
        post_url: normalizedUrl,
        screenshot_url: screenshotUrl,
        caption_text:
          finalStatus === 'approved'
            ? `Diverifikasi AI & OCR: ${ocrReason} | AI Vision: ${geminiScreenshotRes.reason}`
            : captionText || null,
        hashtags: hashtags?.trim() || '#IRS2026',
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

    // 5. Simpan metrik engagement awal
    await supabase.from('post_engagement_stats').insert({
      post_id: newPost.id,
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
    })

    // 6. Jika disetujui otomatis oleh AI/OCR, kreditkan poin langsung
    if (finalStatus === 'approved') {
      const { data: rules } = await supabase
        .from('point_rules')
        .select('platform, base_point')
        .eq('content_type_id', parseInt(contentTypeId))
        .eq('is_active', true)

      let basePoints = 10
      if (rules && rules.length > 0) {
        const specificRule = rules.find((r) => r.platform === platform)
        const fallbackRule = rules.find((r) => r.platform === 'semua')
        basePoints = specificRule ? specificRule.base_point : fallbackRule ? fallbackRule.base_point : 10
      }

      const now = new Date()
      const quarter = Math.floor(now.getMonth() / 3) + 1
      const periodLabel = `${now.getFullYear()}-Q${quarter}`

      const { error: ledgerErr } = await supabase.from('points_ledger').insert({
        user_id: profile.id,
        post_id: newPost.id,
        point_type: 'earn',
        points: basePoints,
        description: `Poin otomatis disetujui lewat verifikasi AI & OCR screenshot (@${cleanExpected})`,
        period_label: periodLabel,
      })

      if (ledgerErr) {
        console.error('AI approved ledger write error:', ledgerErr.message)
        await supabase.from('posts').delete().eq('id', newPost.id)
        await supabase.storage.from('screenshots').remove([filePath])
        return { error: 'Gagal mengkreditkan poin otomatis.' }
      }

      // Notifikasi sukses ke karyawan
      await supabase.from('notifications').insert({
        user_id: profile.id,
        type: 'post_approved',
        message: `Bukti screenshot postingan Anda sukses divalidasi oleh AI Vision & OCR! Anda mendapatkan +${basePoints} poin. 🤖🎉`,
      })
    } else {
      // Jika pending, kirim notifikasi ke Admin Kanwil
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
