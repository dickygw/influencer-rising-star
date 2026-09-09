// =========================================================================
// MODUL: Konfigurasi Environment & Feature Flag
// Kegunaan: Satu tempat pembacaan process.env, agar nilai yang hilang atau
//           salah format terdeteksi sebagai kesalahan yang jelas, bukan
//           sebagai perilaku diam-diam yang baru ketahuan di produksi.
// Catatan : Ditulis tanpa pustaka validasi eksternal supaya tidak menambah
//           dependensi baru pada aplikasi yang sedang dalam remediasi legal.
// Rujukan : docs/REMEDIASI_LEGAL_IRS.md (Fase 0)
// =========================================================================

/**
 * Membaca variabel environment dan membersihkan tanda kutip yang kadang ikut
 * tersalin dari dashboard hosting. String kosong diperlakukan sebagai tidak
 * terisi, supaya `VAR=""` tidak lolos sebagai nilai yang sah.
 */
function readEnv(key: string): string | undefined {
  const raw = process.env[key]
  if (typeof raw !== 'string') return undefined
  const cleaned = raw.replace(/^["']|["']$/g, '').trim()
  return cleaned.length > 0 ? cleaned : undefined
}

function readFlag(key: string, defaultValue: boolean): boolean {
  const raw = readEnv(key)
  if (raw === undefined) return defaultValue
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase())
}

export const isProduction = process.env.NODE_ENV === 'production'

// -------------------------------------------------------------------------
// FEATURE FLAG REMEDIASI LEGAL
// -------------------------------------------------------------------------

export const featureFlags = {
  /**
   * Pengambilan data Instagram lewat scraper pihak ketiga (Apify).
   *
   * DEFAULT MATI. Praktik ini melanggar Ketentuan Layanan Meta dan mengambil
   * data pribadi tanpa dasar pemrosesan yang sah menurut UU 27/2022. Flag ini
   * ada hanya sebagai jalur darurat sementara, dan akan dihapus bersama
   * dependensi `apify-client` setelah migrasi ke Instagram Graph API (Fase 3).
   */
  apifyScraping: readFlag('ENABLE_APIFY_SCRAPING', false),

  /**
   * Scraper tiruan untuk pengembangan lokal.
   *
   * Tidak pernah aktif di produksi berapa pun nilai variabelnya. Sebelumnya
   * mode ini menyala otomatis ketika APIFY_TOKEN tidak ada, sehingga sistem
   * bisa memberikan poin atas metrik karangan bila variabel hilang di server.
   */
  mockScraper: !isProduction && readFlag('ENABLE_MOCK_SCRAPER', false),
} as const

// -------------------------------------------------------------------------
// KREDENSIAL LAYANAN PIHAK KETIGA
// -------------------------------------------------------------------------

export function getApifyToken(): string | undefined {
  return readEnv('APIFY_TOKEN')
}

export function getGeminiApiKey(): string | undefined {
  return readEnv('GEMINI_API_KEY')
}

// -------------------------------------------------------------------------
// PEMERIKSAAN KESEHATAN KONFIGURASI
// -------------------------------------------------------------------------

export type EnvIssue = { key: string; message: string }

const REQUIRED_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const

export function getEnvIssues(): EnvIssue[] {
  const issues: EnvIssue[] = []

  for (const key of REQUIRED_KEYS) {
    if (!readEnv(key)) {
      issues.push({ key, message: 'Wajib diisi, tetapi kosong atau tidak ditemukan.' })
    }
  }

  const supabaseUrl = readEnv('NEXT_PUBLIC_SUPABASE_URL')
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    issues.push({ key: 'NEXT_PUBLIC_SUPABASE_URL', message: 'Harus berupa URL https.' })
  }

  if (featureFlags.apifyScraping) {
    issues.push({
      key: 'ENABLE_APIFY_SCRAPING',
      message:
        'Scraping pihak ketiga sedang AKTIF. Melanggar Ketentuan Layanan Meta dan tidak boleh menyala di produksi.',
    })
    if (!getApifyToken()) {
      issues.push({
        key: 'APIFY_TOKEN',
        message: 'Scraping diaktifkan tetapi token tidak tersedia.',
      })
    }
  }

  if (featureFlags.mockScraper) {
    issues.push({
      key: 'ENABLE_MOCK_SCRAPER',
      message: 'Mock scraper aktif. Metrik yang dihasilkan adalah data karangan, bukan data nyata.',
    })
  }

  return issues
}

// Dijalankan sekali saat modul dimuat di sisi server, supaya salah konfigurasi
// terlihat di log deployment alih-alih muncul sebagai kegagalan acak saat runtime.
if (typeof window === 'undefined') {
  const issues = getEnvIssues()
  if (issues.length > 0) {
    console.warn('[env] Masalah konfigurasi terdeteksi:')
    for (const issue of issues) {
      console.warn(`  - ${issue.key}: ${issue.message}`)
    }
  }
}
