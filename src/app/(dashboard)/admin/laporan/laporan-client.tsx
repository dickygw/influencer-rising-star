'use client'

type LaporanClientProps = {
  stats: {
    totalPoints: number
    approvedPosts: number
    activeEmployees: number
  }
  branchData: any[]
}

export default function LaporanClient({ stats, branchData }: LaporanClientProps) {
  // Export Branch performance data to CSV format
  const handleExportCSV = () => {
    const headers = ['Kode Cabang', 'Nama Cabang', 'Jumlah Post', 'Total Poin', 'Karyawan Aktif']
    const rows = branchData.map((row) => [
      row.kode,
      row.nama,
      row.totalPosts,
      row.totalPoints,
      row.activeParticipants,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Laporan_Advocacy_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="laporan-page animate-fade-in">
      <style jsx>{`
        .laporan-header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-xl);
          flex-wrap: wrap;
          gap: var(--spacing-md);
        }

        .btn-export {
          padding: 0.625rem 1.25rem;
          background: linear-gradient(135deg, var(--green-primary) 0%, #0d6b36 100%);
          color: #ffffff;
          font-weight: 600;
          font-size: 0.875rem;
          border-radius: var(--radius-md);
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid var(--border-gold);
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-export:hover {
          opacity: 0.95;
          transform: translateY(-1px);
        }

        /* Stats Cards */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--spacing-lg);
          margin-bottom: var(--spacing-2xl);
        }

        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
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
          background: rgba(117, 192, 68, 0.08);
          border: 1px solid var(--border-green);
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

        /* Branch performance table */
        .table-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: var(--spacing-lg);
        }

        .table-wrapper {
          background: var(--gradient-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }

        .laporan-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .laporan-table th {
          padding: var(--spacing-lg) var(--spacing-xl);
          background: rgba(0, 0, 0, 0.2);
          color: var(--text-secondary);
          font-size: 0.8125rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-subtle);
        }

        .laporan-table td {
          padding: var(--spacing-lg) var(--spacing-xl);
          border-bottom: 1px solid var(--border-subtle);
          color: var(--text-primary);
        }

        .laporan-table tr:last-child td {
          border-bottom: none;
        }

        .laporan-table tr:hover td {
          background: rgba(255, 255, 255, 0.01);
        }

        .bold-cell {
          font-weight: 600;
        }

        .points-val-cell {
          font-weight: 800;
          color: var(--green-light);
        }
      `}</style>

      <div className="laporan-header-section">
        <div>
          <h1 className="dashboard-greeting" style={{ margin: 0 }}>Laporan & Rekapitulasi</h1>
          <p className="dashboard-date" style={{ marginTop: '4px' }}>
            Pantau performa keaktifan advokasi karyawan Kantor Cabang di bawah wilayah Kanwil Anda.
          </p>
        </div>
        <button className="btn-export" onClick={handleExportCSV}>
          <span>📊</span>
          <span>Ekspor Laporan (CSV)</span>
        </button>
      </div>

      {/* Stats Cards Display */}
      <div className="stats-grid animate-fade-in">
        <div className="stat-card">
          <div className="stat-icon" style={{ borderColor: 'var(--border-gold)', background: 'rgba(251, 197, 19, 0.08)' }}>⭐</div>
          <div>
            <div className="stat-val" style={{ color: 'var(--gold-400)' }}>{stats.totalPoints}</div>
            <div className="stat-lbl">Total Poin Diberikan</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📤</div>
          <div>
            <div className="stat-val">{stats.approvedPosts}</div>
            <div className="stat-lbl">Submission Disetujui</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div>
            <div className="stat-val">{stats.activeEmployees}</div>
            <div className="stat-lbl">Karyawan Aktif</div>
          </div>
        </div>
      </div>

      {/* Branch Table */}
      <h2 className="table-title animate-fade-in" style={{ animationDelay: '100ms', fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>
        📈 Rekap Kinerja Kantor Cabang
      </h2>

      <div className="shadcn-card animate-fade-in" style={{ animationDelay: '150ms' }}>
        <div className="shadcn-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '100px', textAlign: 'center' }}>Kode Cabang</th>
                <th style={{ minWidth: '240px' }}>Nama Kantor Cabang</th>
                <th style={{ minWidth: '140px', textAlign: 'center' }}>Jumlah Konten</th>
                <th style={{ minWidth: '140px', textAlign: 'center' }}>Total Poin</th>
                <th style={{ minWidth: '140px', textAlign: 'center' }}>Influencer Aktif</th>
              </tr>
            </thead>
            <tbody>
              {branchData.length > 0 ? (
                branchData.map((branch) => (
                  <tr key={branch.id}>
                    <td style={{ textAlign: 'center' }}>
                      <span className="shadcn-badge shadcn-badge-secondary" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {branch.kode}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                        {branch.nama}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="metric-chip metric-chip--gray">
                        📝 {branch.totalPosts} Post
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="metric-chip metric-chip--gold">
                        ⭐ {branch.totalPoints.toLocaleString('id-ID')} Poin
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="metric-chip metric-chip--green">
                        👥 {branch.activeParticipants} Orang
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Belum ada data aktivitas cabang.
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
