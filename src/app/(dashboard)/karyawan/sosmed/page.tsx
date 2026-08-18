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
  const [platform, setPlatform] = useState('instagram')
  const [handle, setHandle] = useState('')
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
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
        <h1 className="dashboard-greeting">Akun Sosial Media</h1>
        <p className="dashboard-date">
          Tautkan akun sosial media pribadi Anda untuk mempermudah proses verifikasi postingan.
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

      <div className="layout-grid">
        {/* Link new handle panel */}
        <div className="card-panel">
          <h2 className="placeholder-title" style={{ marginBottom: 'var(--spacing-lg)' }}>
            🔗 Tautkan Akun Baru
          </h2>

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
                  <option value="instagram" style={{ background: 'var(--bg-secondary)' }}>Instagram</option>
                  <option value="tiktok" style={{ background: 'var(--bg-secondary)' }}>TikTok</option>
                  <option value="facebook" style={{ background: 'var(--bg-secondary)' }}>Facebook</option>
                  <option value="x" style={{ background: 'var(--bg-secondary)' }}>X / Twitter</option>
                </select>
              </div>
            </div>

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

            <button type="submit" className="btn-link-submit" disabled={isPending}>
              {isPending ? 'Menautkan...' : 'Tautkan Akun'}
            </button>
          </form>
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
