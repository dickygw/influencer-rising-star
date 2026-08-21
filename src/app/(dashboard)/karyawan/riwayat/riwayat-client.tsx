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

  const totalApprovedPoints = initialSubmissions
    .filter((p) => p.status === 'approved')
    .reduce((acc, curr) => acc + (curr.pointsEarned || 0), 0)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="shadcn-badge shadcn-badge-success">● Disetujui</span>
      case 'rejected':
        return <span className="shadcn-badge shadcn-badge-danger">● Ditolak</span>
      case 'pending':
        return <span className="shadcn-badge shadcn-badge-warning">● Menunggu</span>
      default:
        return <span className="shadcn-badge shadcn-badge-secondary">{status}</span>
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
          line-height: 1;
        }

        .points-label {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text-on-gold);
          opacity: 0.9;
        }

        .reject-reason-box {
          margin-top: 4px;
          font-size: 0.75rem;
          color: #f87171;
          background: rgba(239, 68, 68, 0.08);
          padding: 4px 8px;
          border-radius: 4px;
          border-left: 2px solid #ef4444;
        }

        .shadcn-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          gap: 6px;
        }
        .shadcn-badge-success { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
        .shadcn-badge-danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .shadcn-badge-warning { background: rgba(234, 179, 8, 0.1); color: #eab308; }
        .shadcn-badge-secondary { background: rgba(156, 163, 175, 0.1); color: #9ca3af; }
        .shadcn-badge-purple { background: rgba(168, 85, 247, 0.1); color: #a855f7; }
        .shadcn-badge-blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }

        .shadcn-table-wrapper {
          overflow-x: auto;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        .data-table th {
          padding: 1rem;
          text-align: left;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border-subtle);
        }
        .data-table td {
          padding: 1rem;
          border-bottom: 1px solid var(--border-subtle);
        }

        .metric-chip {
          display: inline-flex;
          padding: 4px 12px;
          border-radius: 9999px;
          font-weight: 700;
          font-size: 0.8125rem;
        }
        .metric-chip--gold { background: rgba(234, 179, 8, 0.15); color: #eab308; }
        .metric-chip--gray { background: rgba(107, 114, 128, 0.1); color: #6b7280; }
      `}</style>

      {/* Header */}
      <div className="riwayat-header">
        <div>
          <h1 className="dashboard-greeting" style={{ margin: 0 }}>Riwayat Submission</h1>
          <p className="dashboard-date" style={{ marginTop: '4px' }}>
            Pantau status verifikasi dan akumulasi poin dari postingan Anda.
          </p>
        </div>

        <div className="points-summary-card">
          <div>
            <div className="points-val">{totalApprovedPoints}</div>
            <div className="points-label">Total Poin Disetujui</div>
          </div>
          <div style={{ fontSize: '2.25rem' }}>🏆</div>
        </div>
      </div>

      {/* Filter Tabs - Shadcn Segmented Control */}
      <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(0, 0, 0, 0.25)', padding: '4px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '4px' }}>
        <button
          onClick={() => setActiveFilter('all')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeFilter === 'all' ? 'var(--bg-card)' : 'transparent',
            color: activeFilter === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
            boxShadow: activeFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
            cursor: 'pointer',
            fontSize: '0.8125rem',
            fontWeight: 600,
            transition: 'all 0.15s ease'
          }}
        >
          Semua ({initialSubmissions.length})
        </button>
        <button
          onClick={() => setActiveFilter('approved')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeFilter === 'approved' ? 'var(--bg-card)' : 'transparent',
            color: activeFilter === 'approved' ? 'var(--green-light)' : 'var(--text-secondary)',
            boxShadow: activeFilter === 'approved' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
            cursor: 'pointer',
            fontSize: '0.8125rem',
            fontWeight: 600,
            transition: 'all 0.15s ease'
          }}
        >
          Disetujui ({initialSubmissions.filter((p) => p.status === 'approved').length})
        </button>
        <button
          onClick={() => setActiveFilter('pending')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeFilter === 'pending' ? 'var(--bg-card)' : 'transparent',
            color: activeFilter === 'pending' ? 'var(--gold-400)' : 'var(--text-secondary)',
            boxShadow: activeFilter === 'pending' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
            cursor: 'pointer',
            fontSize: '0.8125rem',
            fontWeight: 600,
            transition: 'all 0.15s ease'
          }}
        >
          Menunggu ({initialSubmissions.filter((p) => p.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveFilter('rejected')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeFilter === 'rejected' ? 'var(--bg-card)' : 'transparent',
            color: activeFilter === 'rejected' ? '#f87171' : 'var(--text-secondary)',
            boxShadow: activeFilter === 'rejected' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
            cursor: 'pointer',
            fontSize: '0.8125rem',
            fontWeight: 600,
            transition: 'all 0.15s ease'
          }}
        >
          Ditolak ({initialSubmissions.filter((p) => p.status === 'rejected').length})
        </button>
      </div>

      {/* Submissions Table - Shadcn UI */}
      <div className="shadcn-card animate-fade-in" style={{ animationDelay: '150ms' }}>
        <div className="shadcn-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: '240px' }}>Aktivitas Konten</th>
                <th style={{ minWidth: '130px' }}>Platform</th>
                <th style={{ minWidth: '150px' }}>Tanggal Kirim</th>
                <th style={{ minWidth: '140px', textAlign: 'center' }}>Status</th>
                <th style={{ minWidth: '120px', textAlign: 'center' }}>Poin Didapat</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{post.contentTypeName}</div>
                      <div style={{ fontSize: '0.75rem', marginTop: '3px' }}>
                        <a 
                          href={post.postUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ 
                            color: 'var(--green-light)', 
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 500
                          }}
                        >
                          Lihat Postingan Publik ↗
                        </a>
                      </div>
                    </td>
                    <td>
                      <span className={`shadcn-badge ${post.platform === 'instagram' ? 'shadcn-badge-purple' : post.platform === 'tiktok' ? 'shadcn-badge-secondary' : 'shadcn-badge-blue'}`} style={{ textTransform: 'capitalize' }}>
                        {post.platform === 'instagram' ? '📸 Instagram' : post.platform === 'tiktok' ? '📱 TikTok' : post.platform}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {formatDate(post.submittedAt)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {getStatusBadge(post.status)}
                      {post.status === 'rejected' && post.rejectReason && (
                        <div className="reject-reason-box">Alasan: {post.rejectReason}</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {post.status === 'approved' ? (
                        <span className="metric-chip metric-chip--gold">
                          ⭐ +{post.pointsEarned} Poin
                        </span>
                      ) : (
                        <span className="metric-chip metric-chip--gray">
                          0 Poin
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    📄 Tidak ada riwayat postingan dalam kategori ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
