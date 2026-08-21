// =========================================================================
// MODUL: Google Gemini Vision AI Helper
// Kegunaan: Menganalisis gambar dan teks postingan secara multimodal
//           untuk memastikan keaslian konten promosi/produk PT Pegadaian.
// Model: gemini-3.6-flash
// =========================================================================

export type GeminiVisionResult = {
  isValidPegadaianContent: boolean
  confidence: number // 0.0 - 1.0
  detectedElements: string[]
  reason: string
}

/**
 * Menganalisis gambar (melalui URL atau Buffer) dan caption menggunakan Gemini Vision API
 */
export async function analyzeContentWithGeminiVision(
  imageSource: { url?: string; buffer?: Buffer; mimeType?: string },
  captionText?: string
): Promise<GeminiVisionResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not configured. Falling back to permissive check.')
    return {
      isValidPegadaianContent: true,
      confidence: 0.5,
      detectedElements: ['API Key Not Set'],
      reason: 'Pemeriksaan visual AI dilewati karena konfigurasi API key belum tersedia.',
    }
  }

  try {
    let base64Data = ''
    let mimeType = imageSource.mimeType || 'image/jpeg'

    if (imageSource.buffer) {
      base64Data = imageSource.buffer.toString('base64')
    } else if (imageSource.url) {
      try {
        const response = await fetch(imageSource.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })
        if (!response.ok) {
          throw new Error(`Gagal mengunduh gambar postingan (Status ${response.status})`)
        }
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.startsWith('image/')) {
          mimeType = contentType.split(';')[0]
        }
        const arrayBuffer = await response.arrayBuffer()
        base64Data = Buffer.from(arrayBuffer).toString('base64')
      } catch (fetchErr: any) {
        console.error('Error fetching image for Gemini Vision:', fetchErr.message)
        // Jika gagal mengunduh gambar dari Instagram CDN (misal link expired), berikan fallback
        return {
          isValidPegadaianContent: false,
          confidence: 0.0,
          detectedElements: [],
          reason: `Gagal mengakses gambar postingan untuk verifikasi visual AI: ${fetchErr.message}`,
        }
      }
    }

    if (!base64Data) {
      return {
        isValidPegadaianContent: false,
        confidence: 0.0,
        detectedElements: [],
        reason: 'Data gambar postingan kosong atau tidak dapat dibaca.',
      }
    }

    const promptText = `
Anda adalah AI Verifikator Konten Resmi untuk program Employee Advocacy "Influencer Rising Star" PT Pegadaian (Persero).
Tugas Anda adalah memvalidasi apakah gambar/flyer dan teks postingan ini benar-benar memuat materi promosi, branding, atau produk PT Pegadaian.

Parameter yang dianggap VALID (pilih salah satu atau lebih):
1. Logo atau tulisan "Pegadaian", "PT Pegadaian", "Pegadaian Syariah", "Galeri 24", "The Gade", "Sahabat Pegadaian", atau "BUMN".
2. Flyer/brosur/infografis promosi produk Pegadaian (seperti Tabungan Emas, Cicil Emas, Gadai Emas/Elektronik/Kendaraan, Pinjaman Modal Usaha/KUR Syariah, Pembiayaan Haji/Umrah, Mulia, Arrum, dsb).
3. Foto karyawan berseragam resmi Pegadaian / sedang bertugas melayani nasabah di kantor Pegadaian.
4. Foto dokumentasi kegiatan resmi, seminar, literasi keuangan, atau booth promosi PT Pegadaian.
5. Screenshot akun resmi @pegadaian / @pegadaian_kanwil6 atau tangkapan layar transaksi resmi aplikasi Pegadaian Digital.

Parameter yang TIDAK VALID:
- Foto selfie/pribadi/makanan/pemandangan/hewan/meme tanpa adanya unsur branding, logo, flyer, atau materi promosi Pegadaian.
- Flyer atau iklan milik brand/perusahaan lain yang tidak terafiliasi dengan PT Pegadaian.

Caption Pengguna: "${captionText || 'Tidak ada caption'}"

Kembalikan respon HANYA dalam format JSON valid tanpa markdown formatting:
{
  "isValidPegadaianContent": boolean,
  "confidence": number,
  "detectedElements": string[],
  "reason": "Penjelasan singkat dalam bahasa Indonesia mengapa gambar ini valid atau tidak valid sebagai konten promosi Pegadaian"
}
`.trim()

    const requestBody = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
            {
              text: promptText,
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1,
      },
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text()
      console.error(`Gemini API returned error ${geminiRes.status}:`, errBody)
      throw new Error(`Gemini Vision API error (Status ${geminiRes.status})`)
    }

    const resJson = await geminiRes.json()
    const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    
    // Parse JSON response dari model
    const cleanJson = rawText.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleanJson)

    return {
      isValidPegadaianContent: Boolean(parsed.isValidPegadaianContent),
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
      detectedElements: Array.isArray(parsed.detectedElements) ? parsed.detectedElements : [],
      reason: parsed.reason || (parsed.isValidPegadaianContent ? 'Konten terkonfirmasi memuat materi Pegadaian.' : 'Konten tidak memuat unsur Pegadaian.'),
    }
  } catch (error: any) {
    console.error('Error in analyzeContentWithGeminiVision:', error.message)
    // Fallback: Jika terjadi error tak terduga pada AI service, return low confidence
    return {
      isValidPegadaianContent: false,
      confidence: 0.0,
      detectedElements: ['AI Analysis Error'],
      reason: `Gagal memverifikasi konten via AI: ${error.message}`,
    }
  }
}
