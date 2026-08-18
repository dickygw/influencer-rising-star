'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type RiwayatClientProps = {
  initialSubmissions: any[]
  totalBalance: number
}

export default function RiwayatClient({
  initialSubmissions,
  totalBalance,
}: RiwayatClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [activeFilter, setActiveFilter] = useState<string>('all')

  // Realtime subscription to refresh layout data instantly when posts table changes
  useEffect(() => {
    const channel = supabase
      .channel('realtime-riwayat')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  const filteredSubmissions = initialSubmissions.filter((item) => {
    if (activeFilter === 'all') return true
    return item.status === activeFilter
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="status-pill status-pill--approved">Disetujui</span>
      case 'rejected':
        return <span className="status-pill status-pill--rejected">Ditolak</span>
      case 'pending':
        return <span className="status-pill status-pill--pending">Menunggu</span>
      default:
        return <span className="status-pill">{status}</span>
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="riwayat-container animate-fade-in">
      <style jsx>{`
        .riwayat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-xl);
          flex-wrap: wrap;
          gap: var(--spacing-md);
        }

        .points-summary-card {
          background: var(--gradient-gold);
          border: 1px solid var(--border-gold);
          padding: var(--spacing-md) var(--spacing-xl);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          box-shadow: var(--shadow-gold);
        }

        .points-val {
          font-size: 2rem;
          font-weight: 800;
          color: var(--text-on-gold);
        }

        .points-lbl {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-on-gold);
          opacity: 0.8;
        }

        /* Filter Pills */
        .filter-menu {
          display: flex;
          gap: var(--spacing-xs);
          margin-bottom: var(--spacing-xl);
          flex-wrap: wrap;
        }

        .filter-pill {
          padding: 0.5rem 1rem;
          border-radius: var(--radius-full);
          font-size: 0.8125rem;
          font-weight: 600;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }

        .filter-pill:hover {
          color: var(--text-primary);
          border-color: var(--border-default);
        }

        .filter-pill--active {
          background: rgba(117, 192, 68, 0.08);
          border-color: var(--green-light);
          color: var(--green-light);
        }

        /* History Table */
        .table-wrapper {
          background: var(--gradient-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }

        .riwayat-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .riwayat-table th {
          padding: var(--spacing-lg) var(--spacing-xl);
          background: rgba(0, 0, 0, 0.2);
          color: var(--text-secondary);
          font-size: 0.8125rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-subtle);
        }

        .riwayat-table td {
          padding: var(--spacing-lg) var(--spacing-xl);
          border-bottom: 1px solid var(--border-subtle);
          color: var(--text-primary);
          font-size: 0.9375rem;
        }

        .riwayat-table tr:last-child td {
          border-bottom: none;
        }

        .riwayat-table tr:hover td {
          background: rgba(255, 255, 255, 0.01);
        }

        /* Status Pills */
        .status-pill {
          display: inline-flex;
          padding: 0.25rem 0.625rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-pill--approved {
          background: rgba(13, 169, 77, 0.15);
          color: var(--green-light);
          border: 1px solid rgba(13, 169, 77, 0.3);
        }

        .status-pill--rejected {
          background: rgba(239, 68, 68, 0.15);
          color: var(--error);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .status-pill--pending {
          background: rgba(251, 197, 19, 0.08);
          color: var(--gold-400);
          border: 1px solid var(--border-gold);
        }

        .reject-reason-box {
          margin-top: var(--spacing-xs);
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--error-bg);
          border-radius: var(--radius-sm);
          font-size: 0.8125rem;
          color: var(--error);
          border: 1px solid rgba(239, 68, 68, 0.15);
        }

        .points-earned-val {
          font-weight: 800;
          color: var(--green-light);
        }

        .empty-state {
          padding: var(--spacing-3xl);
          text-align: center;
          color: var(--text-secondary);
        }
      `}</style>

      <div className="riwayat-header">
        <div>
          <h1 className="dashboard-greeting" style={{ margin: 0 }}>Riwayat Aktivitas</h1>
          <p className="dashboard-date" style={{ marginTop: '4px' }}>
            Pantau status verifikasi postingan dan perolehan poin Anda.
          </p>
        </div>

        {/* Poin Balance summary */}
        <div className="points-summary-card">
          <span className="points-val">{totalBalance}</span>
          <div>
            <div className="points-lbl">SALDO POIN</div>
            <div className="points-lbl" style={{ fontSize: '0.6875rem', opacity: 0.7 }}>
              Kumulatif Ledger
            </div>
          </div>
        </div>
      </div>

      {/* Filter Menu */}
      <div className="filter-menu">
        <button
          className={`filter-pill ${activeFilter === 'all' ? 'filter-pill--active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          Semua ({initialSubmissions.length})
        </button>
        <button
          className={`filter-pill ${activeFilter === 'pending' ? 'filter-pill--active' : ''}`}
          onClick={() => setActiveFilter('pending')}
        >
          Menunggu ({initialSubmissions.filter((p) => p.status === 'pending').length})
        </button>
        <button
          className={`filter-pill ${activeFilter === 'approved' ? 'filter-pill--active' : ''}`}
          onClick={() => setActiveFilter('approved')}
        >
          Disetujui ({initialSubmissions.filter((p) => p.status === 'approved').length})
        </button>
        <button
          className={`filter-pill ${activeFilter === 'rejected' ? 'filter-pill--active' : ''}`}
          onClick={() => setActiveFilter('rejected')}
        >
          Ditolak ({initialSubmissions.filter((p) => p.status === 'rejected').length})
        </button>
      </div>

      {/* Submissions Table */}
      <div className="table-wrapper">
        <table className="riwayat-table">
          <thead>
            <tr>
              <th>Aktivitas Konten</th>
              <th>Platform</th>
              <th>Tanggal Kirim</th>
              <th>Status</th>
              <th>Poin Didapat</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubmissions.length > 0 ? (
              filteredSubmissions.map((post) => (
                <tr key={post.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{post.contentTypeName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      <a href={post.postUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>
                        Lihat Postingan ↗
                      </a>
                    </div>
                  </td>
                  <td>
                    <span className="role-badge role-badge--karyawan" style={{ textTransform: 'capitalize' }}>
                      {post.platform}
                    </span>
                  </td>
                  <td>{formatDate(post.submittedAt)}</td>
                  <td>
                    {getStatusBadge(post.status)}
                    {post.status === 'rejected' && post.rejectReason && (
                      <div className="reject-reason-box">Alasan: {post.rejectReason}</div>
                    )}
                  </td>
                  <td className="points-earned-val">
                    {post.status === 'approved' ? `+${post.pointsEarned} Poin` : '0 Poin'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="empty-state">
                  📄 Tidak ada riwayat postingan dalam kategori ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
