import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'


// =========================================================================
// SECURITY: Domain whitelist untuk mencegah Open Redirect Attack
// Hanya domain resmi PT Pegadaian yang diizinkan sebagai target redirect.
// =========================================================================
const ALLOWED_REDIRECT_DOMAINS = [
  'pegadaian.co.id',
  'www.pegadaian.co.id',
  'sahabatpegadaian.com',
  'www.sahabatpegadaian.com',
]

function isAllowedRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    return ALLOWED_REDIRECT_DOMAINS.some(
      (d) => parsed.hostname === d || parsed.hostname.endsWith('.' + d)
    )
  } catch {
    return false
  }
}

// =========================================================================
// SECURITY: Hash IP address untuk privasi (PDP/GDPR compliance)
// IP di-hash satu arah agar tetap bisa deduplikasi tanpa menyimpan PII.
// =========================================================================
async function hashIpAddress(ip: string): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(ip + '_irs2026_salt')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return 'hash_error'
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params
  const cleanHandle = (handle || '').trim().toLowerCase().replace(/^@+/, '')

  const defaultDestination = 'https://www.pegadaian.co.id/produk/tabungan-emas'
  let targetUrl = defaultDestination

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseAnonKey && cleanHandle) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)

      // 1. Ambil Destination URL aktif dari campaign_settings
      const { data: campaign } = await supabase
        .from('campaign_settings')
        .select('destination_url')
        .eq('id', 'default')
        .eq('is_active', true)
        .maybeSingle()

      // SECURITY: Validasi destination_url terhadap domain whitelist
      if (campaign?.destination_url && isAllowedRedirectUrl(campaign.destination_url)) {
        targetUrl = campaign.destination_url
      }

      // 2. Cari pemilik handle di social_accounts
      // SECURITY FIX: Gunakan .eq() exact match, BUKAN .ilike() wildcard
      const { data: socialAcc } = await supabase
        .from('social_accounts')
        .select('user_id, handle')
        .eq('handle', cleanHandle)
        .maybeSingle()

      // 3. Catat klik ke tabel link_clicks
      const referrer = request.headers.get('referer') || null
      const userAgent = request.headers.get('user-agent') || null
      const rawIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anon'
      const ip = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : 'anon'

      // SECURITY: Hash IP address sebelum disimpan (privasi)
      const hashedIp = await hashIpAddress(ip)

      await supabase.from('link_clicks').insert({
        user_id: socialAcc?.user_id || null,
        handle: cleanHandle,
        destination_url: targetUrl,
        referrer,
        user_agent: userAgent,
        ip_address: hashedIp,
      })
    } catch (err: any) {
      console.error('Error logging click in /r/[handle]:', err.message)
    }
  }

  // 4. Tambahkan parameter UTM pelacak kampanye
  let finalRedirectUrl = targetUrl
  try {
    const parsed = new URL(targetUrl)
    parsed.searchParams.set('utm_source', 'irs2026')
    parsed.searchParams.set('utm_medium', 'instagram_bio')
    parsed.searchParams.set('utm_campaign', 'employee_advocacy')
    parsed.searchParams.set('utm_content', cleanHandle || 'unknown')
    finalRedirectUrl = parsed.toString()
  } catch {
    finalRedirectUrl = targetUrl
  }

  return NextResponse.redirect(finalRedirectUrl, { status: 307 })
}

