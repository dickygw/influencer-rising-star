'use client'

import { getRiwayatSubmissions, getPointsSummary } from '../riwayat/actions'
import { useEffect, useState } from 'react'

export default function KaryawanPoinPage() {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [totalBalance, setTotalBalance] = useState(0)

  useEffect(() => {
    async function loadData() {
      const [riwayatRes, pointsRes] = await Promise.all([
        getRiwayatSubmissions(),
        getPointsSummary(),
      ])
      if (riwayatRes.success && riwayatRes.data) setSubmissions(riwayatRes.data)
      if (pointsRes.success && typeof pointsRes.totalBalance === 'number') setTotalBalance(pointsRes.totalBalance)
    }
    loadData()
  }, [])

  // Filter only approved ones that actually awarded points
  const approvedSubmissions = submissions.filter(s => s.status === 'approved')

  return (
    <div className="poin-page animate-fade-in">
      <style jsx>{`
        .poin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-2xl);
          flex-wrap: wrap;
          gap: var(--spacing-md);
        }

        .balance-giant-card {
          background: var(--gradient-gold);
          border: 1px solid var(--border-gold);
          border-radius: 16px;
          padding: var(--spacing-2xl);
          box-shadow: var(--shadow-gold);
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          max-width: 500px;
          position: relative;
          overflow: hidden;
        }

        .balance-val {
          font-size: 3.5rem;
          font-weight: 900;
          color: #0d1117;
          line-height: 1;
        }

        .balance-meta {
          color: #0d1117;
        }

        /* Timeline */
        .timeline-section {
          background: var(--bg-card);
          border: 1px solid var(--border-default);
          border-radius: 16px;
          padding: var(--spacing-2xl);
          box-shadow: var(--shadow-lg);
        }

        .timeline-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: var(--spacing-xl);
        }

        .timeline {
          position: relative;
          padding-left: 2rem;
          border-left: 2px solid var(--border-default);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
        }

        .timeline-item {
          position: relative;
        }

        .timeline-dot {
          position: absolute;
          left: calc(-2rem - 7px);
          top: 4px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--green-light);
          border: 2px solid var(--bg-primary);
          box-shadow: 0 0 8px var(--green-light);
        }

        .timeline-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-subtle);
          border-radius: 14px;
          padding: var(--spacing-lg);
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: transform var(--transition-fast);
        }

        .timeline-card:hover {
          transform: translateX(4px);
          border-color: var(--green-light);
        }

        .timeline-date {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: var(--spacing-xs);
        }

        .timeline-name {
          font-weight: 700;
          color: var(--text-primary);
        }

        .timeline-platform {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 2px;
          text-transform: capitalize;
        }

        .timeline-points {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--green-light);
        }
      `}</style>

      <div className="poin-header">
        <div>
          <h1 className="dashboard-greeting" style={{ margin: 0 }}>Poin Saya</h1>
          <p className="dashboard-date" style={{ marginTop: '4px' }}>
            Rincian akumulasi saldo poin dari aktivitas employee advocacy sosial media Anda.
          </p>
        </div>

        {/* Big balance display */}
        <div className="balance-giant-card animate-scale-in">
          <div>
            <div className="balance-val">{totalBalance}</div>
            <div className="balance-meta" style={{ fontWeight: 700, fontSize: '1rem', marginTop: '4px' }}>Total Poin</div>
          </div>
          <div className="balance-meta" style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.5rem' }}>⭐</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '4px' }}>
              PT Pegadaian (Persero)<br />Kanwil VI Kalimantan
            </div>
          </div>
        </div>
      </div>

      {/* Points history timeline */}
      <div className="timeline-section">
        <h2 className="timeline-title">📜 Histori Penambahan Poin</h2>

        {approvedSubmissions.length > 0 ? (
          <div className="timeline">
            {approvedSubmissions.map((post) => (
              <div key={post.id} className="timeline-item animate-fade-in-up">
                <div className="timeline-dot" />
                <div className="timeline-card">
                  <div>
                    <div className="timeline-date">
                      {new Date(post.submittedAt).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div className="timeline-name">{post.contentTypeName}</div>
                    <div className="timeline-platform">Platform: {post.platform}</div>
                  </div>
                  <div className="timeline-points">+{post.pointsEarned} Poin</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--spacing-3xl) 0', fontSize: '0.875rem' }}>
            Belum ada poin yang diperoleh. Kirim bukti postingan Anda dan tunggu verifikasi Admin!
          </div>
        )}
      </div>
    </div>
  )
}
