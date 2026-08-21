'use client'

import { useState, useTransition, useEffect } from 'react'
import { submitPost } from './actions'
import ConfirmationDialog from '../../confirmation-dialog'

type SubmissionClientProps = {
  contentTypes: any[]
  initialQuota: {
    quotaRemaining: number
    submittedToday: number
  }
}

export default function SubmissionClient({
  contentTypes,
  initialQuota,
}: SubmissionClientProps) {
  // State untuk melacak kuota harian postingan karyawan
  const [quota, setQuota] = useState(initialQuota)
  // State untuk melacak platform media sosial terpilih (Instagram, TikTok, FB, X)
  const [platform, setPlatform] = useState('instagram')
  // State untuk melacak kategori konten terpilih
  const [contentTypeId, setContentTypeId] = useState(contentTypes[0]?.id?.toString() || '')
  // State untuk menyimpan tautan link postingan yang diinput karyawan
  const [postUrl, setPostUrl] = useState('')
  const [captionText, setCaptionText] = useState('')
  const [hashtags, setHashtags] = useState('')
  // State untuk melacak metode verifikasi: 'auto' (Scraper) atau 'manual' (OCR screenshot)
  const [verifyMethod, setVerifyMethod] = useState<'auto' | 'manual'>('auto')
  
  // State upload file gambar bukti (tangkapan layar / screenshot)
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Transition state untuk melacak proses server action (loading state)
  const [isPending, startTransition] = useTransition()
  // State untuk menampilkan pesan sukses atau gagal (berwarna hijau/merah) di atas form
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  // State untuk konfigurasi dialog konfirmasi kustom
  const [confirmData, setConfirmData] = useState<{
    isOpen: boolean
    type: 'success' | 'warning' | 'danger' | 'info'
    title: string
    message: string
    confirmText?: string
    onConfirm: () => void
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: () => {},
  })

  // State dan array deskripsi loading dinamis untuk animasi HP pengunggah konten
  const [loadingStep, setLoadingStep] = useState(0)
  const loadingSteps = verifyMethod === 'auto'
    ? [
        'Menghubungkan ke Instagram...',
        'Mengambil data postingan via Scraper...',
        'Memvalidasi kepemilikan akun Instagram...',
        'Google Gemini Vision memindai visual flyer & produk Pegadaian...',
        'Menghitung poin pencapaian...'
      ]
    : [
        'Membaca gambar bukti tangkapan layar...',
        'Menyiapkan mesin OCR & Google Gemini Vision...',
        'Memindai visual & teks materi promosi Pegadaian...',
        'Mencocokkan handle akun media sosial...',
        'Memeriksa kelengkapan hashtag #IRS2026...'
      ]

  // Effect untuk menggerakkan (rotasi) teks progres loading setiap 1.8 detik saat proses kirim aktif
  useEffect(() => {
    if (!isPending) return

    const interval = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % loadingSteps.length)
    }, 1800)

    return () => {
      clearInterval(interval)
      setLoadingStep(0)
    }
  }, [isPending, loadingSteps.length])


  const handlePlatformChange = (val: string) => {
    setPlatform(val)
    if (val !== 'instagram') {
      setVerifyMethod('manual')
    } else {
      setVerifyMethod('auto')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Ukuran file terlalu besar (maksimal 5MB)' })
        return
      }
      setScreenshot(file)
      setPreviewUrl(URL.createObjectURL(file))
      setMessage(null)
    }
  }

  const executeSubmit = async () => {
    const formData = new FormData()
    formData.append('platform', platform)
    formData.append('contentTypeId', contentTypeId)
    formData.append('postUrl', postUrl)
    formData.append('captionText', captionText)
    formData.append('hashtags', hashtags)
    formData.append('verifyMethod', verifyMethod)
    if (verifyMethod === 'manual' && screenshot) {
      formData.append('screenshot', screenshot)
    }

    startTransition(async () => {
      const result = await submitPost(formData)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({
          type: 'success',
          text: verifyMethod === 'auto' 
            ? 'Postingan Anda berhasil diverifikasi otomatis! Poin Anda langsung ditambahkan ke saldo.'
            : 'Postingan Anda berhasil dikirim! Silakan menunggu verifikasi dari Admin Kanwil.',
        })
        
        // Reset form inputs
        setPostUrl('')
        setCaptionText('')
        setHashtags('')
        setScreenshot(null)
        setPreviewUrl(null)

        // Update quota local count
        if (typeof result.quotaRemaining === 'number') {
          setQuota({
            quotaRemaining: result.quotaRemaining,
            submittedToday: 3 - result.quotaRemaining,
          })
        }
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (verifyMethod === 'manual' && !screenshot) {
      setMessage({ type: 'error', text: 'Wajib mengunggah bukti gambar screenshot' })
      return
    }

    if (!postUrl.trim()) {
      setMessage({ type: 'error', text: 'Link postingan (URL) wajib diisi' })
      return
    }

    setMessage(null)

    // Open confirmation dialog
    setConfirmData({
      isOpen: true,
      type: 'info',
      title: verifyMethod === 'auto' ? 'Mulai Verifikasi Instan?' : 'Kirim Submission?',
      message: verifyMethod === 'auto'
        ? 'Sistem akan otomatis memindai postingan Instagram Anda secara live. Pastikan akun diset publik dan mengandung hashtag #IRS2026.'
        : 'Sistem akan memverifikasi screenshot Anda secara lokal menggunakan OCR. Pastikan screenshot Anda memuat username terdaftar dan hashtag #IRS2026.',
      confirmText: verifyMethod === 'auto' ? 'Ya, Verifikasi' : 'Ya, Kirim Sekarang',
      onConfirm: () => {
        setConfirmData(prev => ({ ...prev, isOpen: false }))
        executeSubmit()
      }
    })
  }

  const isLimitReached = quota.quotaRemaining <= 0

  return (
    <div className="submission-page animate-fade-in">
      <style jsx>{`
        .submission-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-xl);
          flex-wrap: wrap;
          gap: var(--spacing-md);
        }

        .quota-card {
          background: rgba(117, 192, 68, 0.08);
          border: 1px solid var(--border-green);
          padding: var(--spacing-md) var(--spacing-lg);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .quota-number {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--green-light);
        }

        .quota-label {
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }

        .quota-card--locked {
          background: rgba(239, 68, 68, 0.08);
          border-color: rgba(239, 68, 68, 0.2);
        }

        .quota-card--locked .quota-number {
          color: var(--error);
        }

        .form-layout {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: var(--spacing-xl);
        }

        @media (max-width: 900px) {
          .form-layout {
            grid-template-columns: 1fr;
          }
        }

        .card-form {
          background: var(--gradient-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          box-shadow: var(--shadow-lg);
        }

        /* Upload styling */
        .upload-zone {
          border: 2px dashed var(--border-default);
          border-radius: var(--radius-lg);
          padding: var(--spacing-2xl) var(--spacing-md);
          text-align: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          background: rgba(13, 20, 14, 0.3);
          position: relative;
          overflow: hidden;
          min-height: 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .upload-zone:hover:not(.disabled) {
          border-color: var(--green-light);
          background: rgba(117, 192, 68, 0.03);
        }

        .upload-icon {
          font-size: 2.5rem;
          margin-bottom: var(--spacing-sm);
          color: var(--text-muted);
        }

        .upload-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--spacing-xs);
        }

        .upload-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .upload-preview {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: var(--bg-primary);
        }

        .preview-overlay {
          position: absolute;
          bottom: var(--spacing-md);
          right: var(--spacing-md);
          background: rgba(0, 0, 0, 0.8);
          color: var(--text-primary);
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-sm);
          font-size: 0.6875rem;
          font-weight: 600;
          border: 1px solid var(--border-default);
          z-index: 10;
        }

        .btn-submit {
          width: 100%;
          padding: 0.875rem;
          background: var(--gradient-green);
          color: var(--text-on-gold);
          font-size: 0.9375rem;
          font-weight: 700;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-green);
          transition: all var(--transition-fast);
          margin-top: var(--spacing-lg);
        }

        .btn-submit:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }

        .form-group-custom {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          margin-bottom: var(--spacing-lg);
        }
      `}</style>

      <div className="submission-header">
        <div>
          <h1 className="dashboard-greeting" style={{ margin: 0 }}>Submit Bukti Postingan</h1>
          <p className="dashboard-date" style={{ marginTop: '4px' }}>
            Kirimkan link dan tangkapan layar (screenshot) bukti promosi Anda.
          </p>
        </div>

        {/* Quota Tracker */}
        <div className={`quota-card ${isLimitReached ? 'quota-card--locked' : ''}`}>
          <div className="quota-number">
            {quota.quotaRemaining} / 3
          </div>
          <div>
            <div className="quota-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Sisa Kuota Hari Ini
            </div>
            <div className="quota-label">
              Anda sudah submit {quota.submittedToday} hari ini
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={message.type === 'success' ? 'role-badge role-badge--karyawan' : 'login-error'}
          style={{
            display: 'flex',
            width: '100%',
            padding: 'var(--spacing-md)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--spacing-xl)',
            fontSize: '0.875rem',
            background: message.type === 'success' ? 'rgba(13, 169, 77, 0.1)' : 'var(--error-bg)',
            color: message.type === 'success' ? 'var(--green-light)' : 'var(--error)',
            border: `1px solid ${message.type === 'success' ? 'var(--border-green)' : 'rgba(239, 68, 68, 0.2)'}`,
          }}
        >
          <span style={{ marginRight: 'var(--spacing-sm)', fontSize: '1.1rem' }}>
            {message.type === 'success' ? '✅' : '⚠️'}
          </span>
          <span>{message.text}</span>
        </div>
      )}

      {isLimitReached ? (
        <div className="placeholder-card" style={{ padding: 'var(--spacing-3xl)' }}>
          <div className="placeholder-icon" style={{ color: 'var(--error)' }}>🔒</div>
          <h2 className="placeholder-title">Batas Submission Tercapai</h2>
          <p className="placeholder-text">
            Anda telah mengirimkan 3 submission hari ini. Batas harian diatur untuk mencegah spam.
            Silakan kembali esok hari untuk mengirimkan postingan baru Anda. Terima kasih atas partisipasinya!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {/* Verification Method Tabs (Only for Instagram) */}
          {platform === 'instagram' && (
            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }} className="animate-fade-in">
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  borderRadius: 'var(--radius-md)',
                  background: verifyMethod === 'auto' ? 'rgba(13, 169, 77, 0.08)' : 'var(--bg-secondary)',
                  border: `1px solid ${verifyMethod === 'auto' ? 'var(--green-light)' : 'var(--border-default)'}`,
                  color: verifyMethod === 'auto' ? '#0d6b36' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
                onClick={() => setVerifyMethod('auto')}
                disabled={isPending}
              >
                ✨ Verifikasi Otomatis (Instan)
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  borderRadius: 'var(--radius-md)',
                  background: verifyMethod === 'manual' ? 'rgba(13, 169, 77, 0.08)' : 'var(--bg-secondary)',
                  border: `1px solid ${verifyMethod === 'manual' ? 'var(--green-light)' : 'var(--border-default)'}`,
                  color: verifyMethod === 'manual' ? '#0d6b36' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
                onClick={() => setVerifyMethod('manual')}
                disabled={isPending}
              >
                📸 Verifikasi Manual (Upload)
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="form-layout">
            {/* Form inputs */}
            <div className="card-form">
              <div className="form-group-custom">
                <label className="form-label" htmlFor="platform">Media Sosial</label>
                <div className="form-input-wrapper">
                  <select
                    id="platform"
                    className="form-input"
                    value={platform}
                    onChange={(e) => handlePlatformChange(e.target.value)}
                    disabled={isPending}
                    style={{ paddingLeft: '1rem', appearance: 'auto' }}
                  >
                    <option value="instagram" style={{ background: 'var(--bg-secondary)' }}>Instagram</option>
                    <option value="tiktok" style={{ background: 'var(--bg-secondary)' }}>TikTok</option>
                    <option value="facebook" style={{ background: 'var(--bg-secondary)' }}>Facebook</option>
                    <option value="x" style={{ background: 'var(--bg-secondary)' }}>X / Twitter</option>
                  </select>
                </div>
              </div>

              <div className="form-group-custom">
                <label className="form-label" htmlFor="content-type">Jenis Konten</label>
                <div className="form-input-wrapper">
                  <select
                    id="content-type"
                    className="form-input"
                    value={contentTypeId}
                    onChange={(e) => setContentTypeId(e.target.value)}
                    disabled={isPending}
                    style={{ paddingLeft: '1rem', appearance: 'auto' }}
                  >
                    {contentTypes.map((type) => (
                      <option key={type.id} value={type.id} style={{ background: 'var(--bg-secondary)' }}>
                        {type.nama} ({type.deskripsi})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group-custom">
                <label className="form-label" htmlFor="post-url">Link Postingan (URL)</label>
                <div className="form-input-wrapper">
                  <input
                    id="post-url"
                    type="url"
                    className="form-input"
                    placeholder={platform === 'instagram' ? "https://www.instagram.com/p/..." : "Masukkan link postingan sosmed Anda"}
                    value={postUrl}
                    onChange={(e) => setPostUrl(e.target.value)}
                    required
                    disabled={isPending}
                    style={{ paddingLeft: '1rem' }}
                  />
                </div>
              </div>

              {verifyMethod === 'manual' && (
                <>
                  <div className="form-group-custom animate-fade-in">
                    <label className="form-label" htmlFor="caption-text">Isi Caption / Narasi (Opsional)</label>
                    <div className="form-input-wrapper">
                      <textarea
                        id="caption-text"
                        className="form-input"
                        placeholder="Masukkan caption postingan Anda"
                        value={captionText}
                        onChange={(e) => setCaptionText(e.target.value)}
                        disabled={isPending}
                        rows={4}
                        style={{ padding: '0.75rem 1rem', height: 'auto' }}
                      />
                    </div>
                  </div>

                  <div className="form-group-custom animate-fade-in">
                    <label className="form-label" htmlFor="hashtags">Hashtags (Opsional)</label>
                    <div className="form-input-wrapper">
                      <input
                        id="hashtags"
                        type="text"
                        className="form-input"
                        placeholder="Contoh: #Pegadaian #RisingStar"
                        value={hashtags}
                        onChange={(e) => setHashtags(e.target.value)}
                        disabled={isPending}
                        style={{ paddingLeft: '1rem' }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right block: Screenshot upload OR Auto Verify info box */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
              {verifyMethod === 'auto' ? (
                <div className="card-form animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                  <span style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>✨</span>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--spacing-xs)' }}>
                    Verifikasi Instan Tanpa Login
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: '320px', marginBottom: 'var(--spacing-lg)' }}>
                    Sistem akan memvalidasi postingan Instagram Anda secara otomatis. Pastikan akun Instagram Anda diset ke <strong>Publik</strong> dan caption postingan Anda mengandung hashtag wajib <strong>#IRS2026</strong>.
                  </p>
                  
                  <div style={{ flex: 1 }} />
                  
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={isPending || !postUrl}
                  >
                    {isPending ? 'Memverifikasi Postingan...' : 'Mulai Verifikasi Instan'}
                  </button>
                </div>
              ) : (
                <div className="card-form animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label className="form-label" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    Tangkapan Layar Bukti (Screenshot)
                  </label>

                  <div
                    className="upload-zone"
                    onClick={() => document.getElementById('screenshot-file')?.click()}
                  >
                    <input
                      id="screenshot-file"
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                      disabled={isPending}
                    />

                    {previewUrl ? (
                      <>
                        <img src={previewUrl} className="upload-preview" alt="Preview bukti" />
                        <div className="preview-overlay">Ganti Gambar</div>
                      </>
                    ) : (
                      <>
                        <span className="upload-icon">📸</span>
                        <div className="upload-title">Klik atau seret file gambar ke sini</div>
                        <div className="upload-desc">Format PNG, JPG, atau WEBP (Maksimal 5MB)</div>
                      </>
                    )}
                  </div>

                  <div style={{ flex: 1 }} />

                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={isPending || !screenshot}
                  >
                    {isPending ? 'Mengirim Submission...' : 'Kirim Sekarang'}
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Dialog Component */}
      <ConfirmationDialog
        isOpen={confirmData.isOpen}
        onClose={() => setConfirmData(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmData.onConfirm}
        title={confirmData.title}
        message={confirmData.message}
        confirmText={confirmData.confirmText}
        type={confirmData.type}
        isLoading={isPending}
      />

      {/* Premium Smartphone Uploading Loading Overlay */}
      {isPending && (
        <div className="upload-overlay-backdrop">
          <div className="upload-loading-card">
            <div className="animation-scene">
              <div className="pulse-ring"></div>
              <div className="pulse-ring"></div>
              <div className="pulse-ring"></div>
              
              {/* Floating Cloud */}
              <div className="upload-cloud">☁️</div>

              {/* Smartphone Frame */}
              <div className="phone-frame">
                <div className="phone-notch"></div>
                <div className="phone-screen">
                  {/* Sliding IG Post Mockup */}
                  <div className="instagram-post-mockup">
                    <div className="mock-header">
                      <div className="mock-avatar"></div>
                      <div className="mock-line-sm"></div>
                    </div>
                    <div className="mock-image">
                      {platform === 'instagram' ? '📸' : platform === 'tiktok' ? '🎵' : '📱'}
                    </div>
                    <div className="mock-line-md"></div>
                    <div className="mock-line-lg"></div>
                  </div>
                </div>
              </div>

              {/* Flying Paper Airplane */}
              <div className="paper-plane">✈️</div>
            </div>

            <h3 className="upload-title-text">Memproses Verifikasi</h3>
            <div className="upload-status-text">
              {loadingSteps[loadingStep]}
            </div>

            <div className="progress-bar-container">
              <div className="progress-bar-fill"></div>
            </div>

            <span className="upload-footer-text">
              Mohon tunggu, jangan menutup halaman ini...
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
