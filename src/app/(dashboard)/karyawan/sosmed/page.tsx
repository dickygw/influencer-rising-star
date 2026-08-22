'use client'

import { useState, useEffect, useTransition } from 'react'
import { getSocialAccounts, linkSocialAccount, unlinkSocialAccount } from './actions'
import ConfirmationDialog from '../../confirmation-dialog'

type SocialAccount = {
  id: string
  platform: string
  handle: string
  created_at: string
}

export default function KaryawanSosmedPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [totalClicks, setTotalClicks] = useState<number>(0)
  const [activeCampaign, setActiveCampaign] = useState<{ campaignName: string; destinationUrl: string }>({
    campaignName: 'Promo Tabungan Emas Pegadaian',
    destinationUrl: 'https://www.pegadaian.co.id/produk/tabungan-emas',
  })
  const [platform, setPlatform] = useState('instagram')
  const [handle, setHandle] = useState('')
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [confirmData, setConfirmData] = useState<{
    isOpen: boolean
    type: 'success' | 'warning' | 'danger' | 'info'
    title: string
    message: string
    confirmText?: string
    onConfirm: () => void
  }>({
    isOpen: false,
    type: 'danger',
    title: '',
    message: '',
    onConfirm: () => {},
  })

  const fetchAccounts = async () => {
    const res = await getSocialAccounts()
    if (res.success && res.data) {
      setAccounts(res.data)
      if (res.totalClicks !== undefined) setTotalClicks(res.totalClicks)
      if (res.activeCampaign) setActiveCampaign(res.activeCampaign)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!handle.trim()) {
      setMessage({ type: 'error', text: 'Username/handle wajib diisi' })
      return
    }

    startTransition(async () => {
      const res = await linkSocialAccount(platform, handle)
      if (res.success) {
        setMessage({ type: 'success', text: `Berhasil menautkan akun @${handle.replace(/^@/, '')}!` })
        setHandle('')
        fetchAccounts()
      } else {
        setMessage({ type: 'error', text: res.error || 'Gagal menautkan akun' })
      }
    })
  }

  const handleUnlink = async (id: string) => {
    const res = await unlinkSocialAccount(id)
    if (res.success) {
      setMessage({ type: 'success', text: 'Tautan akun berhasil dihapus' })
      fetchAccounts()
    } else {
      setMessage({ type: 'error', text: res.error || 'Gagal menghapus tautan' })
    }
  }

  const getPlatformStyle = (platformName: string) => {
    switch (platformName.toLowerCase()) {
      case 'instagram':
        return {
          bg: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
          text: '#ffffff',
          icon: '📸',
        }
      case 'tiktok':
        return {
          bg: 'linear-gradient(135deg, #010101 0%, #1e1e1e 100%)',
          text: '#ffffff',
          border: '1px solid #25f4ee',
          icon: '🎵',
        }
      case 'facebook':
        return {
          bg: '#1877f2',
          text: '#ffffff',
          icon: '👥',
        }
      case 'x':
        return {
          bg: '#000000',
          text: '#ffffff',
          border: '1px solid #333333',
          icon: '🐦',
        }
      default:
        return {
          bg: 'var(--bg-secondary)',
          text: 'var(--text-primary)',
          icon: '📱',
        }
    }
  }

  // Cari akun Instagram utama
  const igAccount = accounts.find((a) => a.platform.toLowerCase() === 'instagram')
  const cleanIgHandle = igAccount ? igAccount.handle.replace(/^@+/, '').trim() : ''
  const smartReferralUrl = cleanIgHandle
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://irs.pegadaian.co.id'}/r/${cleanIgHandle}`
    : ''

  return (
    <div className="sosmed-page animate-fade-in">
      <style jsx>{`
        .sosmed-header {
          margin-bottom: var(--spacing-xl);
        }

        .layout-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: var(--spacing-xl);
          margin-bottom: var(--spacing-xl);
        }

        @media (max-width: 768px) {
          .layout-grid {
            grid-template-columns: 1fr;
          }
        }

        .card-panel {
          background: var(--gradient-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          box-shadow: var(--shadow-lg);
        }

        .platform-badge-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--spacing-md);
        }

        .sosmed-item {
          padding: var(--spacing-lg);
          border-radius: var(--radius-lg);
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: var(--shadow-md);
        }

        .sosmed-details {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .sosmed-icon-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }

        .btn-unlink {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          padding: 0.375rem 0.75rem;
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          font-weight: 700;
          transition: all var(--transition-fast);
        }

        .btn-unlink:hover {
          background: rgba(239, 68, 68, 0.8);
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
        }

        .form-group-custom {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          margin-bottom: var(--spacing-lg);
        }

        .btn-link-submit {
          width: 100%;
          padding: 0.875rem;
          background: var(--gradient-green);
          color: var(--text-on-gold);
          font-size: 0.9375rem;
          font-weight: 700;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-green);
          transition: all var(--transition-fast);
        }

        .btn-link-submit:hover:not(:disabled) {
          transform: translateY(-1px);
        }
      `}</style>

      <div className="sosmed-header">
        <h1 className="dashboard-greeting">Akun Sosial Media & Smart Bio Link</h1>
        <p className="dashboard-date">
          Tautkan akun sosial media Anda dan dapatkan tautan promosi unik untuk dipasang di Bio Instagram.
        </p>
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
          <span style={{ marginRight: 'var(--spacing-sm)' }}>
            {message.type === 'success' ? '✅' : '⚠️'}
          </span>
          <span>{message.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* KARTU KHUSUS: SMART REFERRAL BIO LINK UNTUK KARYAWAN                      */}
      {/* ========================================================================= */}
      {igAccount ? (
        <div
          className="card animate-scale-in"
          style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, rgba(0, 107, 63, 0.15) 0%, rgba(217, 119, 6, 0.1) 100%)',
            border: '1px solid var(--border-gold)',
            borderRadius: 'var(--radius-xl)',
            marginBottom: '1.75rem',
            boxShadow: '0 0 20px rgba(0, 107, 63, 0.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f09433, #bc1888)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  boxShadow: '0 0 10px rgba(225, 48, 108, 0.4)',
                }}
              >
                🔗
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Tautan Promosi Bio Instagram Anda
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Tempel tautan ini di Bio Instagram akun <strong>@{cleanIgHandle}</strong> untuk mengarahkan calon nasabah ke produk resmi Pegadaian.
                </p>
              </div>
            </div>

            {/* Total Klik Badge */}
            <div
              style={{
                background: 'rgba(236, 72, 153, 0.15)',
                border: '1px solid rgba(236, 72, 153, 0.3)',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'right',
              }}
            >
              <div style={{ fontSize: '0.6875rem', color: '#f472b6', fontWeight: 700, textTransform: 'uppercase' }}>
                Total Klik Calon Nasabah
              </div>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#f472b6' }}>
                🔗 {totalClicks.toLocaleString('id-ID')} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Klik</span>
              </div>
            </div>
          </div>

          {/* Copy Link Input Box */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              background: 'var(--bg-primary)',
              padding: '0.5rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-default)',
              marginBottom: '1rem',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <input
              type="text"
              readOnly
              value={smartReferralUrl}
              style={{
                flex: 1,
                minWidth: '240px',
                background: 'transparent',
                border: 'none',
                color: 'var(--gold-primary)',
                fontFamily: 'monospace',
                fontSize: '0.9375rem',
                fontWeight: 700,
                padding: '0.5rem 0.75rem',
                outline: 'none',
              }}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(smartReferralUrl)
                setCopiedLink(true)
                setTimeout(() => setCopiedLink(false), 2500)
              }}
              className="btn btn--primary"
              style={{
                background: copiedLink ? 'var(--green-light)' : 'linear-gradient(135deg, var(--green-primary), #006837)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.8125rem',
                padding: '0.625rem 1.25rem',
              }}
            >
              {copiedLink ? '✅ Tautan Tersalin!' : '📋 Salin Tautan'}
            </button>
            <a
              href={`/r/${cleanIgHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--secondary"
              style={{ fontSize: '0.8125rem', padding: '0.625rem 1rem' }}
            >
              Uji Tautan ↗
            </a>
          </div>

          {/* Destination & Tutorial Pill */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Saat ini diarahkan ke: </span>
              <strong style={{ color: 'var(--gold-primary)' }}>{activeCampaign.campaignName}</strong>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              💡 <strong>Cara Pasang di Bio:</strong> Buka Aplikasi Instagram &rarr; <strong>Edit Profil</strong> &rarr; <strong>Tautan / Links</strong> &rarr; Tambah Tautan Eksternal &rarr; Tempel Tautan Ini.
            </div>
          </div>
        </div>
      ) : (
        <div
          className="card animate-fade-in"
          style={{
            padding: '1.25rem',
            background: 'rgba(217, 119, 6, 0.08)',
            border: '1px dashed var(--gold-primary)',
            borderRadius: 'var(--radius-xl)',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>ℹ️</span>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Tautkan akun <strong>Instagram</strong> Anda di bawah ini untuk mendapatkan <strong>Tautan Promosi Bio Unik</strong> dan melacak jumlah calon nasabah yang Anda arahkan ke Pegadaian!
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FORM TAUTKAN AKUN & DAFTAR AKUN TERTAUT                                   */}
      {/* ========================================================================= */}
      <div className="layout-grid">
        {/* Link new handle panel */}
        {/* Link new handle panel */}
        <div className="card-panel">
          <h2 className="placeholder-title" style={{ marginBottom: 'var(--spacing-lg)' }}>
            🔗 Tautkan Akun Baru
          </h2>

          <div style={{ marginBottom: '1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
            ℹ️ <strong>Ketentuan:</strong> Setiap karyawan diperbolehkan menautkan <strong>maksimal 1 akun</strong> untuk setiap media sosial (1 Instagram, 1 TikTok, 1 Facebook, 1 X).
          </div>

          {(() => {
            const currentLinked = accounts.find((a) => a.platform.toLowerCase() === platform.toLowerCase())
            const allLinked = ['instagram', 'tiktok', 'facebook', 'x'].every((p) =>
              accounts.some((a) => a.platform.toLowerCase() === p)
            )

            if (allLinked) {
              return (
                <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 'var(--radius-lg)', color: '#86efac', textAlign: 'center', fontSize: '0.875rem' }}>
                  🎉 <strong>Lengkap!</strong> Anda telah menautkan akun untuk semua platform media sosial (Instagram, TikTok, Facebook, dan X).
                </div>
              )
            }

            return (
              <form onSubmit={handleLink}>
                <div className="form-group-custom">
                  <label className="form-label" htmlFor="sosmed-platform">Platform Sosial Media</label>
                  <div className="form-input-wrapper">
                    <select
                      id="sosmed-platform"
                      className="form-input"
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      disabled={isPending}
                      style={{ paddingLeft: '1rem', appearance: 'auto' }}
                    >
                      {[
                        { id: 'instagram', label: 'Instagram' },
                        { id: 'tiktok', label: 'TikTok' },
                        { id: 'facebook', label: 'Facebook' },
                        { id: 'x', label: 'X / Twitter' },
                      ].map((item) => {
                        const linked = accounts.find((a) => a.platform.toLowerCase() === item.id)
                        return (
                          <option
                            key={item.id}
                            value={item.id}
                            style={{ background: 'var(--bg-secondary)' }}
                          >
                            {item.label} {linked ? `(Sudah Tertaut: @${linked.handle})` : ''}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </div>

                {currentLinked ? (
                  <div style={{ padding: '0.75rem', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: 'var(--radius-md)', color: '#fde047', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                    ⚠️ Anda sudah menautkan akun {platform.toUpperCase()} (<strong>@{currentLinked.handle}</strong>). Untuk mengganti akun, hapus/putuskan tautan akun lama pada daftar di sebelah kanan terlebih dahulu.
                  </div>
                ) : (
                  <div className="form-group-custom">
                    <label className="form-label" htmlFor="sosmed-handle">Username / Handle</label>
                    <div className="form-input-wrapper">
                      <input
                        id="sosmed-handle"
                        type="text"
                        className="form-input"
                        placeholder="Contoh: dian.prasetya"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value)}
                        disabled={isPending}
                        required
                        style={{ paddingLeft: '1.75rem' }}
                      />
                      <span style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)', fontSize: '0.9375rem' }}>@</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-link-submit"
                  disabled={isPending || !!currentLinked}
                  style={currentLinked ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  {isPending ? 'Menautkan...' : currentLinked ? 'Platform Sudah Tertaut' : 'Tautkan Akun'}
                </button>
              </form>
            )
          })()}
        </div>

        {/* Existing handles panel */}
        <div className="card-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 className="placeholder-title" style={{ marginBottom: 'var(--spacing-lg)' }}>
            📱 Akun Tertaut ({accounts.length})
          </h2>

          {accounts.length > 0 ? (
            <div className="platform-badge-grid">
              {accounts.map((acc) => {
                const style = getPlatformStyle(acc.platform)
                return (
                  <div
                    key={acc.id}
                    className="sosmed-item animate-scale-in"
                    style={{
                      background: style.bg,
                      color: style.text,
                      border: (style as any).border || 'none',
                    }}
                  >
                    <div className="sosmed-details">
                      <div className="sosmed-icon-circle">{style.icon}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', textTransform: 'capitalize' }}>
                          {acc.platform}
                        </div>
                        <div style={{ opacity: 0.8, fontSize: '0.8125rem', marginTop: '2px' }}>
                          @{acc.handle}
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn-unlink"
                      onClick={() => setConfirmData({
                        isOpen: true,
                        type: 'danger',
                        title: 'Hapus Tautan Akun?',
                        message: `Apakah Anda yakin ingin menghapus tautan akun ${acc.platform} dengan handle "@${acc.handle}"? Anda tidak akan dapat melakukan pengajuan postingan menggunakan akun ini.`,
                        confirmText: 'Ya, Hapus Tautan',
                        onConfirm: async () => {
                          setConfirmData(prev => ({ ...prev, isOpen: false }))
                          await handleUnlink(acc.id)
                        }
                      })}
                    >
                      Hapus
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', padding: 'var(--spacing-2xl) 0' }}>
              Belum ada akun sosial media yang ditautkan.
            </div>
          )}
        </div>
      </div>

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
    </div>
  )
}
