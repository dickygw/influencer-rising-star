'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAdminDashboardSummary } from './actions'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [summary, setSummary] = useState<any>(null)

  useEffect(() => {
    async function loadData() {
      const res = await getAdminDashboardSummary()
      if (res.success && res.summary) {
        setSummary(res.summary)
      }
    }
    loadData()
  }, [])

  if (!summary) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Memuat data dashboard...
      </div>
    )
  }

  const { pendingCount, employeeCount, recentPosts } = summary

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="admin-dashboard animate-fade-in">
      <style jsx>{`
        .admin-dashboard {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
        }

        /* Pending verification banner alert */
        .pending-alert-card {
          background: rgba(251, 197, 19, 0.08);
          border: 1px solid var(--border-gold);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg) var(--spacing-xl);
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: var(--shadow-gold);
          cursor: pointer;
          transition: transform var(--transition-fast);
        }

        .pending-alert-card:hover {
          transform: translateY(-2px);
          background: rgba(251, 197, 19, 0.12);
        }

        .pending-alert-text {
          font-weight: 700;
          color: var(--gold-400);
          font-size: 1rem;
        }

        .pending-alert-btn {
          padding: 0.5rem 1rem;
          background: var(--gradient-gold);
          color: var(--text-on-gold);
          border-radius: var(--radius-md);
          font-weight: 700;
          font-size: 0.8125rem;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-lg);
        }

        @media (max-width: 600px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }

        .stat-card {
          background: var(--gradient-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          box-shadow: var(--shadow-md);
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
        }

        .stat-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .stat-val {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .stat-lbl {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Activity section */
        .dashboard-section {
          background: var(--gradient-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          box-shadow: var(--shadow-lg);
        }

        .section-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: var(--spacing-lg);
        }

        .activity-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md) 0;
          border-bottom: 1px solid var(--border-subtle);
        }

        .activity-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .activity-main {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .activity-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--bg-elevated);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--green-light);
        }

        .activity-name {
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--text-primary);
        }

        .activity-details {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .activity-badge {
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: capitalize;
        }
      `}</style>

      {/* Breadcrumbs (PEA Style) */}
      <div className="pea-breadcrumbs animate-fade-in">
        <span>IRS 2026</span>
        <span>/</span>
        <a href="/admin" onClick={(e) => { e.preventDefault(); router.push('/admin') }}>Admin</a>
        <span>/</span>
        <span>Overview</span>
      </div>

      <div style={{ marginBottom: 'var(--spacing-lg)' }} className="animate-fade-in">
        <h1 className="dashboard-greeting" style={{ margin: 0 }}>Admin / Overview</h1>
        <p className="dashboard-date" style={{ marginTop: '4px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Selamat datang kembali di Dashboard Kelola Wilayah
        </p>
      </div>

      {/* Hero Banner (PEA Style) */}
      <div className="pea-hero-banner animate-scale-in">
        <div className="pea-hero-content">
          <span className="pea-hero-badge" style={{ background: 'rgba(230, 184, 32, 0.15)', color: 'var(--gold-400)', borderColor: 'var(--border-gold)' }}>
            Panel Pengawas Wilayah
          </span>
          <h2 className="pea-hero-title">Pantau Advokasi Karyawan Anda!</h2>
          <p className="pea-hero-sub">
            Verifikasi pengiriman konten promosi secara berkala, pantau kinerja leaderboard karyawan di wilayah Anda, dan unduh laporan aktivitas secara instan.
          </p>
        </div>
        <div className="pea-hero-trophy">📊</div>
      </div>

      {/* Target Alert Strip / Verification Alert (PEA Style) */}
      {pendingCount > 0 ? (
        <div className="pea-sub-alert animate-fade-in" style={{ animationDelay: '50ms', cursor: 'pointer', border: '1px solid var(--border-gold)' }} onClick={() => router.push('/admin/verifikasi')}>
          <div className="pea-sub-alert-text">
            <span>📥</span>
            <span>Terdapat <strong style={{ color: 'var(--gold-400)' }}>{pendingCount} submission</strong> baru menunggu persetujuan Anda.</span>
          </div>
          <span className="nav-badge nav-badge--gold" style={{ textTransform: 'uppercase', fontSize: '0.6875rem' }}>Verifikasi ➡️</span>
        </div>
      ) : (
        <div className="pea-sub-alert animate-fade-in" style={{ animationDelay: '50ms' }}>
          <div className="pea-sub-alert-text">
            <span>✅</span>
            <span>Semua pengiriman konten dari karyawan telah diverifikasi. Pekerjaan Anda selesai!</span>
          </div>
          <span className="nav-badge nav-badge--green" style={{ textTransform: 'uppercase', fontSize: '0.6875rem' }}>Selesai</span>
        </div>
      )}

      {/* Stats Cards Row */}
      <div className="stats-grid animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ borderColor: 'var(--border-green)', background: 'rgba(13, 169, 77, 0.08)' }}>👥</div>
          <div>
            <div className="stat-val">{employeeCount}</div>
            <div className="stat-lbl">Karyawan Terdaftar</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ borderColor: 'var(--border-gold)', background: 'rgba(251, 197, 19, 0.08)' }}>📥</div>
          <div>
            <div className="stat-val">{pendingCount}</div>
            <div className="stat-lbl">Submission Pending</div>
          </div>
        </div>
      </div>

      {/* Recent submissions list */}
      <div className="shadcn-card animate-fade-in" style={{ padding: '1.25rem', animationDelay: '200ms' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
          🕒 Aktivitas Pengiriman Terbaru
        </h2>
        
        {recentPosts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentPosts.map((post: any) => {
              const initials = post.user?.nama
                ? post.user.nama
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                : 'KY'

              return (
                <div 
                  key={post.id} 
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.875rem 1rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="shadcn-avatar">
                      {initials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                        {post.user?.nama}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Mengirim <strong>{post.content_type?.nama}</strong> • {formatDate(post.submitted_at)}
                      </div>
                    </div>
                  </div>

                  <div className={`shadcn-badge ${post.platform === 'instagram' ? 'shadcn-badge-purple' : post.platform === 'tiktok' ? 'shadcn-badge-secondary' : 'shadcn-badge-blue'}`} style={{ textTransform: 'capitalize' }}>
                    {post.platform === 'instagram' ? '📸 Instagram' : post.platform === 'tiktok' ? '📱 TikTok' : post.platform}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.875rem' }}>
            Belum ada aktivitas pengiriman postingan dari karyawan.
          </div>
        )}
      </div>
    </div>
  )
}
