'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getKaryawanDashboardSummary } from './actions'

export default function KaryawanDashboardPage() {
  const router = useRouter()
  const [summary, setSummary] = useState<any>(null)

  useEffect(() => {
    async function loadData() {
      const res = await getKaryawanDashboardSummary()
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

  const { totalBalance, quotaRemaining, stats } = summary

  return (
    <div className="karyawan-dashboard animate-fade-in">
      <style jsx>{`
        .karyawan-dashboard {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
        }

        /* Top Layout: Balance and Quota */
        .dashboard-top-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-lg);
        }

        @media (max-width: 768px) {
          .dashboard-top-row {
            grid-template-columns: 1fr;
          }
        }

        .balance-card {
          background: var(--gradient-gold);
          border: 1px solid var(--border-gold);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          box-shadow: var(--shadow-gold-lg);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .balance-value {
          font-size: 3rem;
          font-weight: 900;
          color: var(--text-on-gold);
          line-height: 1;
        }

        .balance-label {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text-on-gold);
          opacity: 0.8;
        }

        .quota-card {
          background: var(--gradient-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          box-shadow: var(--shadow-md);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .quota-val {
          font-size: 2.25rem;
          font-weight: 800;
          color: var(--green-light);
        }

        .btn-quick-submit {
          padding: 0.625rem 1.25rem;
          background: var(--gradient-green);
          color: var(--text-on-gold);
          font-weight: 700;
          font-size: 0.875rem;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-green);
        }

        .btn-quick-submit:hover {
          transform: translateY(-1px);
        }

        /* Stats Grid */
        .stats-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--spacing-md);
        }

        .summary-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md) var(--spacing-lg);
          text-align: center;
          box-shadow: var(--shadow-sm);
        }

        .summary-card-val {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 2px;
        }

        .summary-card-lbl {
          font-size: 0.6875rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Guide Board */
        .guide-section {
          background: var(--gradient-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          box-shadow: var(--shadow-lg);
        }

        .guide-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: var(--spacing-lg);
        }

        .step-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .step-item {
          display: flex;
          gap: var(--spacing-md);
        }

        .step-num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(117, 192, 68, 0.1);
          border: 1px solid var(--border-green);
          color: var(--green-light);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.8125rem;
          flex-shrink: 0;
        }

        .step-content {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .pea-breadcrumbs {
          display: flex;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .pea-hero-banner {
          background: linear-gradient(135deg, #0da94d 0%, #065f2d 100%);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: white;
        }

        .pea-hero-badge {
          background: rgba(255,255,255,0.2);
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .pea-hero-title {
          font-size: 1.5rem;
          margin: 0.75rem 0;
        }

        .pea-hero-sub {
          font-size: 0.875rem;
          opacity: 0.9;
          max-width: 600px;
        }

        .pea-sub-alert {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          padding: 1rem;
          border-radius: var(--radius-lg);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
      `}</style>

      {/* Breadcrumbs (PEA Style) */}
      <div className="pea-breadcrumbs animate-fade-in">
        <span>IRS 2026</span>
        <span>/</span>
        <a href="/karyawan" onClick={(e) => { e.preventDefault(); router.push('/karyawan') }}>Home</a>
        <span>/</span>
        <span>Overview</span>
      </div>

      <div style={{ marginBottom: 'var(--spacing-lg)' }} className="animate-fade-in">
        <h1 className="dashboard-greeting" style={{ margin: 0 }}>Home / Overview</h1>
        <p className="dashboard-date" style={{ marginTop: '4px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Selamat datang, <strong style={{ color: 'var(--green-light)' }}>{summary.nama}</strong>
        </p>
      </div>

      {/* Hero Banner (PEA Style) */}
      <div className="pea-hero-banner animate-scale-in">
        <div className="pea-hero-content">
          <span className="pea-hero-badge">IRS Journey 2026</span>
          <h2 className="pea-hero-title">Selamat Berjuang di Influencer Rising Star 2026!</h2>
          <p className="pea-hero-sub">
            Bagikan konten promosi resmi Pegadaian di sosial media Anda, kumpulkan poin keaktifan, dan raih penghargaan bergengsi sebagai Influencer terbaik tingkat nasional.
          </p>
        </div>
        <div className="pea-hero-trophy">🏆</div>
      </div>

      {/* Target Alert Strip (PEA Style) */}
      <div className="pea-sub-alert animate-fade-in" style={{ animationDelay: '50ms' }}>
        <div className="pea-sub-alert-text">
          <span>📋</span>
          <span><strong>Target Poin Kuartal Ini:</strong> Kumpulkan minimal 200 poin keaktifan sebelum 23:59 WIB, 30 September 2026.</span>
        </div>
        <span className="nav-badge nav-badge--green" style={{ textTransform: 'uppercase', fontSize: '0.6875rem' }}>Q3 AKTIF</span>
      </div>

      {/* Top Row: Balance and Quota */}
      <div className="dashboard-top-row animate-scale-in" style={{ animationDelay: '100ms' }}>
        {/* Points balance */}
        <div className="balance-card">
          <div>
            <div className="balance-value">{totalBalance}</div>
            <div className="balance-label" style={{ marginTop: '4px' }}>Poin Terkumpul</div>
          </div>
          <div style={{ fontSize: '2.5rem' }}>⭐</div>
        </div>

        {/* Quota limit */}
        <div className="quota-card">
          <div>
            <div className="quota-val">{quotaRemaining} / 3</div>
            <div className="balance-label" style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
              Kuota Submit Hari Ini
            </div>
          </div>
          {quotaRemaining > 0 ? (
            <button className="btn-quick-submit" onClick={() => router.push('/karyawan/submission')}>
              Submit Post 📤
            </button>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Limit Tercapai</span>
          )}
        </div>
      </div>

      {/* Submission stats summary */}
      <div className="stats-summary-grid animate-fade-in" style={{ animationDelay: '150ms' }}>
        <div className="summary-card" style={{ borderColor: 'rgba(13, 169, 77, 0.15)' }}>
          <div className="summary-card-val" style={{ color: 'var(--green-light)' }}>{stats.approved}</div>
          <div className="summary-card-lbl">Post Disetujui</div>
        </div>

        <div className="summary-card" style={{ borderColor: 'var(--border-gold)' }}>
          <div className="summary-card-val" style={{ color: 'var(--gold-400)' }}>{stats.pending}</div>
          <div className="summary-card-lbl">Post Pending</div>
        </div>

        <div className="summary-card" style={{ borderColor: 'rgba(239, 68, 68, 0.15)' }}>
          <div className="summary-card-val" style={{ color: 'var(--error)' }}>{stats.rejected}</div>
          <div className="summary-card-lbl">Post Ditolak</div>
        </div>
      </div>

      {/* Advocacy guide checklist */}
      <div className="guide-section animate-fade-in" style={{ animationDelay: '200ms' }}>
        <h2 className="guide-title">📚 Cara Berpartisipasi & Dapatkan Poin</h2>

        <div className="step-list">
          <div className="step-item">
            <div className="step-num">1</div>
            <div className="step-content">
              <strong>Tautkan Sosial Media:</strong> Daftarkan username sosial media pribadi Anda (Instagram, TikTok, FB, X) di menu **Akun Sosmed**.
            </div>
          </div>

          <div className="step-item">
            <div className="step-num">2</div>
            <div className="step-content">
              <strong>Posting Promosi:</strong> Bagikan postingan Pegadaian di sosial media Anda atau buat testimoni kreatif bertema Pegadaian.
            </div>
          </div>

          <div className="step-item">
            <div className="step-num">3</div>
            <div className="step-content">
              <strong>Submit Bukti:</strong> Ambil screenshot postingan, lalu kirimkan bukti link dan screenshot lewat menu **Submit Konten**.
            </div>
          </div>

          <div className="step-item">
            <div className="step-num">4</div>
            <div className="step-content">
              <strong>Kumpulkan Poin:</strong> Tunggu verifikasi dari Admin Kanwil. Poin akan bertambah otomatis ke saldo Anda setelah disetujui!
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
