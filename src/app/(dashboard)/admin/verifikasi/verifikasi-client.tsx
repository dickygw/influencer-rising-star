'use client'

import { useState, useEffect } from 'react'
import { approveSubmission, rejectSubmission, getPendingSubmissions } from './actions'
import { createClient } from '@/lib/supabase/client'
import ConfirmationDialog from '../../confirmation-dialog'

type VerifikasiClientProps = {
  initialPending: any[]
}

export default function VerifikasiClient({ initialPending }: VerifikasiClientProps) {
  const [pendingList, setPendingList] = useState(initialPending)
  const supabase = createClient()
  
  // Modal states
  const [selectedPost, setSelectedPost] = useState<any | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [confirmData, setConfirmData] = useState<{
    isOpen: boolean
    type: 'success' | 'warning' | 'danger' | 'info'
    title: string
    message: string
    confirmText?: string
    onConfirm: () => void
  }>({
    isOpen: false,
    type: 'warning',
    title: '',
    message: '',
    onConfirm: () => {},
  })

  const handleRefresh = async () => {
    const res = await getPendingSubmissions()
    if (res.success && res.data) {
      setPendingList(res.data)
    }
  }

  // Subscribe to realtime database changes for posts table
  useEffect(() => {
    const channel = supabase
      .channel('realtime-verifikasi')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          handleRefresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const triggerToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const handleApprove = async (postId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await approveSubmission(postId)
      if (res.success) {
        triggerToast('success', 'Submission berhasil disetujui dan poin telah ditambahkan ke karyawan!')
        setSelectedPost(null)
        handleRefresh()
      } else {
        setError(res.error || 'Gagal menyetujui submission')
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async (postId: string) => {
    if (!rejectReason.trim()) {
      setError('Alasan penolakan wajib diisi')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const res = await rejectSubmission(postId, rejectReason)
      if (res.success) {
        triggerToast('success', 'Submission berhasil ditolak')
        setSelectedPost(null)
        setRejectReason('')
        handleRefresh()
      } else {
        setError(res.error || 'Gagal menolak submission')
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="verifikasi-page animate-fade-in">
      <style jsx>{`
        .verifikasi-header {
          margin-bottom: var(--spacing-xl);
        }

        .table-wrapper {
          background: var(--gradient-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }

        .verifikasi-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .verifikasi-table th {
          padding: var(--spacing-lg) var(--spacing-xl);
          background: rgba(0, 0, 0, 0.2);
          color: var(--text-secondary);
          font-size: 0.8125rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-subtle);
        }

        .verifikasi-table td {
          padding: var(--spacing-lg) var(--spacing-xl);
          border-bottom: 1px solid var(--border-subtle);
          color: var(--text-primary);
          font-size: 0.9375rem;
        }

        .verifikasi-table tr:last-child td {
          border-bottom: none;
        }

        .verifikasi-table tr:hover td {
          background: rgba(255, 255, 255, 0.01);
        }

        .btn-review {
          padding: 0.5rem 1rem;
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--gold-400);
          font-size: 0.8125rem;
          font-weight: 600;
          transition: all var(--transition-fast);
        }

        .btn-review:hover {
          border-color: var(--gold-400);
          background: rgba(251, 197, 19, 0.05);
        }

        /* Modal styling */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: var(--spacing-md);
          animation: fadeIn 200ms ease-out;
        }

        .modal-card {
          width: 100%;
          max-width: 900px;
          background: var(--gradient-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-xl);
          overflow: hidden;
          position: relative;
          display: grid;
          grid-template-columns: 1fr 1fr;
          height: 80vh;
          animation: scaleIn 300ms var(--transition-spring);
        }

        @media (max-width: 768px) {
          .modal-card {
            grid-template-columns: 1fr;
            height: 90vh;
            overflow-y: auto;
          }
        }

        .modal-image-pane {
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          border-right: 1px solid var(--border-subtle);
          height: 100%;
        }

        .modal-screenshot {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .modal-info-pane {
          padding: var(--spacing-xl);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
          overflow-y: auto;
          height: 100%;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: var(--spacing-md);
        }

        .modal-close {
          color: var(--text-muted);
          font-size: 1.25rem;
        }

        .info-group {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .info-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .info-val {
          font-size: 0.9375rem;
          color: var(--text-primary);
        }

        .btn-approve {
          padding: 0.75rem;
          background: var(--gradient-green);
          color: var(--text-on-gold);
          border-radius: var(--radius-md);
          font-weight: 700;
          box-shadow: var(--shadow-green);
          text-align: center;
          transition: all var(--transition-fast);
        }

        .btn-approve:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .btn-reject {
          padding: 0.75rem;
          background: var(--error-bg);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: var(--error);
          border-radius: var(--radius-md);
          font-weight: 700;
          text-align: center;
          transition: all var(--transition-fast);
        }

        .btn-reject:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.15);
        }

        .toast {
          position: fixed;
          bottom: var(--spacing-xl);
          right: var(--spacing-xl);
          padding: var(--spacing-md) var(--spacing-xl);
          border-radius: var(--radius-md);
          z-index: 200;
          animation: fadeInUp 300ms ease-out;
          font-weight: 600;
          box-shadow: var(--shadow-xl);
        }

        .toast--success {
          background: var(--success-bg);
          color: var(--green-light);
          border: 1px solid var(--border-green);
        }
      `}</style>

      {/* Toast Alert */}
      {toast && (
        <div className={`toast toast--${toast.type}`}>
          {toast.type === 'success' ? '✅' : '⚠️'} {toast.message}
        </div>
      )}

      <div className="verifikasi-header">
        <h1 className="dashboard-greeting">Verifikasi Submission</h1>
        <p className="dashboard-date">
          Tinjau bukti postingan sosial media dari seluruh karyawan di wilayah Anda.
        </p>
      </div>

      <div className="table-wrapper">
        <table className="verifikasi-table">
          <thead>
            <tr>
              <th>Karyawan</th>
              <th>Cabang</th>
              <th>Platform</th>
              <th>Jenis Aktivitas</th>
              <th>Tanggal Kirim</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pendingList.length > 0 ? (
              pendingList.map((post) => (
                <tr key={post.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{post.user?.nama}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      NIP: {post.user?.nip}
                    </div>
                  </td>
                  <td>{post.user?.cabang?.nama || '-'}</td>
                  <td>
                    <span className="role-badge role-badge--karyawan" style={{ textTransform: 'capitalize' }}>
                      {post.platform}
                    </span>
                  </td>
                  <td>{post.content_type?.nama}</td>
                  <td>{formatDate(post.submitted_at)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-review" onClick={() => setSelectedPost(post)}>
                      🔎 Tinjau
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ padding: 'var(--spacing-3xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
                  🎉 Hore! Tidak ada antrean submission yang pending saat ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Verification Dialog Modal */}
      {selectedPost && (
        <div className="modal-backdrop">
          <div className="modal-card">
            {/* Left: Screenshot preview */}
            <div className="modal-image-pane">
              {selectedPost.screenshot_signed_url ? (
                <img
                  src={selectedPost.screenshot_signed_url}
                  className="modal-screenshot"
                  alt="Screenshot bukti postingan"
                />
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>Gambar tidak tersedia</div>
              )}
            </div>

            {/* Right: Submission details & actions */}
            <div className="modal-info-pane">
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Detail Submission</h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Oleh: {selectedPost.user?.nama} (NIP: {selectedPost.user?.nip})
                  </p>
                </div>
                <button className="modal-close" onClick={() => {
                  setSelectedPost(null)
                  setRejectReason('')
                  setError(null)
                }}>
                  ✕
                </button>
              </div>

              {error && (
                <div className="login-error" style={{ margin: 0 }}>
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="info-group">
                <span className="info-label">Jenis Konten</span>
                <span className="info-val" style={{ fontWeight: 600 }}>{selectedPost.content_type?.nama}</span>
              </div>

              <div className="info-group">
                <span className="info-label">Platform</span>
                <span className="info-val" style={{ textTransform: 'capitalize' }}>{selectedPost.platform}</span>
              </div>

              <div className="info-group">
                <span className="info-label">Link Postingan</span>
                <span className="info-val">
                  <a href={selectedPost.post_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>
                    Buka Link Postingan Publik ↗
                  </a>
                </span>
              </div>

              {selectedPost.caption_text && (
                <div className="info-group">
                  <span className="info-label">Isi Caption</span>
                  <span className="info-val" style={{ background: 'rgba(0,0,0,0.2)', padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                    {selectedPost.caption_text}
                  </span>
                </div>
              )}

              {selectedPost.hashtags && (
                <div className="info-group">
                  <span className="info-label">Hashtags</span>
                  <span className="info-val" style={{ color: 'var(--green-light)', fontSize: '0.875rem' }}>{selectedPost.hashtags}</span>
                </div>
              )}

              <div style={{ flex: 1, minHeight: 'var(--spacing-lg)' }} />

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--spacing-md)' }}>
                {/* Approve Button */}
                <button
                  className="btn-approve"
                  onClick={() => setConfirmData({
                    isOpen: true,
                    type: 'success',
                    title: 'Setujui Konten?',
                    message: `Apakah Anda yakin ingin menyetujui postingan ini dari "${selectedPost.user?.nama}"? Karyawan akan menerima poin atas submission ini secara instan.`,
                    confirmText: 'Ya, Setujui',
                    onConfirm: async () => {
                      await handleApprove(selectedPost.id)
                      setConfirmData(prev => ({ ...prev, isOpen: false }))
                    }
                  })}
                  disabled={isLoading}
                >
                  {isLoading ? 'Memproses...' : 'Setujui (Approve)'}
                </button>

                {/* Reject Area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)' }}>
                  <textarea
                    className="form-input"
                    placeholder="Alasan penolakan (Wajib diisi jika menolak)..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    disabled={isLoading}
                    rows={2}
                    style={{ padding: '0.5rem 0.75rem', height: 'auto', fontSize: '0.8125rem' }}
                  />
                  <button
                    className="btn-reject"
                    onClick={() => setConfirmData({
                      isOpen: true,
                      type: 'danger',
                      title: 'Tolak Konten?',
                      message: `Apakah Anda yakin ingin menolak postingan ini dari "${selectedPost.user?.nama}" dengan alasan: "${rejectReason}"?`,
                      confirmText: 'Ya, Tolak',
                      onConfirm: async () => {
                        await handleReject(selectedPost.id)
                        setConfirmData(prev => ({ ...prev, isOpen: false }))
                      }
                    })}
                    disabled={isLoading || !rejectReason.trim()}
                  >
                    Tolak (Reject)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmData.isOpen}
        onClose={() => setConfirmData(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmData.onConfirm}
        title={confirmData.title}
        message={confirmData.message}
        confirmText={confirmData.confirmText}
        type={confirmData.type}
        isLoading={isLoading}
      />
    </div>
  )
}
