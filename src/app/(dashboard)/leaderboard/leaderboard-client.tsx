'use client'

import { useState } from 'react'

type LeaderboardClientProps = {
  initialIndividu: any[]
  initialCabang: any[]
}

export default function LeaderboardClient({
  initialIndividu,
  initialCabang,
}: LeaderboardClientProps) {
  const [activeTab, setActiveTab] = useState<'individu' | 'cabang'>('individu')

  const list = activeTab === 'individu' ? initialIndividu : initialCabang
  const topThree = list.slice(0, 3)
  const remainingList = list.slice(3)

  // Gamification tier badge helper
  const getBadgeInfo = (points: number) => {
    if (points >= 300) {
      return { icon: '🥇', label: 'Gold Advocate', color: 'var(--gold-400)' }
    } else if (points >= 100) {
      return { icon: '🥈', label: 'Silver Advocate', color: '#cbd5e1' }
    } else {
      return { icon: '🥉', label: 'Bronze Advocate', color: '#b45309' }
    }
  }

  // Get initials for custom profile avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="leaderboard-container animate-fade-in">
      <style jsx>{`
        .leaderboard-header {
          margin-bottom: var(--spacing-xl);
        }

        .tab-menu {
          display: flex;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          padding: 4px;
          border-radius: var(--radius-lg);
          margin-bottom: var(--spacing-2xl);
          width: fit-content;
        }

        .tab-btn {
          padding: 0.625rem 1.5rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }

        .tab-btn:hover {
          color: var(--text-primary);
        }

        .tab-btn--active {
          background: var(--gradient-green);
          color: var(--text-on-gold) !important;
          box-shadow: var(--shadow-sm);
        }

        /* Podium Layout */
        .podium-container {
          display: grid;
          grid-template-columns: 1fr 1.2fr 1fr;
          align-items: flex-end;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-2xl);
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }

        @media (max-width: 600px) {
          .podium-container {
            grid-template-columns: 1fr;
            align-items: stretch;
            gap: var(--spacing-lg);
          }
        }

        .podium-card {
          background: var(--gradient-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl) var(--spacing-md);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          box-shadow: var(--shadow-md);
          transition: transform var(--transition-base);
        }

        .podium-card:hover {
          transform: translateY(-4px);
        }

        .podium-card--1st {
          border-color: var(--border-gold);
          box-shadow: var(--shadow-gold);
          padding: var(--spacing-2xl) var(--spacing-md) var(--spacing-xl);
          order: 2;
        }

        @media (max-width: 600px) {
          .podium-card--1st {
            order: 0;
          }
        }

        .podium-card--2nd {
          order: 1;
        }

        .podium-card--3rd {
          order: 3;
        }

        .podium-rank-badge {
          position: absolute;
          top: -15px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.875rem;
          color: #000;
          box-shadow: var(--shadow-sm);
        }

        .podium-rank-badge--1st {
          background: #fbc513;
          width: 36px;
          height: 36px;
          top: -18px;
          font-size: 1rem;
        }

        .podium-rank-badge--2nd {
          background: #cbd5e1;
        }

        .podium-rank-badge--3rd {
          background: #b45309;
        }

        .podium-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--bg-elevated);
          border: 2px solid var(--border-default);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9375rem;
          margin-bottom: var(--spacing-md);
          color: var(--green-light);
        }

        .podium-card--1st .podium-avatar {
          width: 60px;
          height: 60px;
          font-size: 1.125rem;
          border-color: var(--gold-400);
        }

        .podium-name {
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 150px;
        }

        .podium-sub {
          font-size: 0.6875rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .podium-points {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--green-light);
          margin-top: var(--spacing-sm);
        }

        .podium-card--1st .podium-points {
          color: var(--gold-400);
          font-size: 1.5rem;
        }

        /* Leaderboard Table List */
        .table-wrapper {
          background: var(--gradient-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }

        .leaderboard-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .leaderboard-table th {
          padding: var(--spacing-lg) var(--spacing-xl);
          background: rgba(0, 0, 0, 0.2);
          color: var(--text-secondary);
          font-size: 0.8125rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-subtle);
        }

        .leaderboard-table td {
          padding: var(--spacing-lg) var(--spacing-xl);
          border-bottom: 1px solid var(--border-subtle);
          color: var(--text-primary);
        }

        .leaderboard-table tr:last-child td {
          border-bottom: none;
        }

        .leaderboard-table tr:hover td {
          background: rgba(255, 255, 255, 0.01);
        }

        .rank-cell {
          font-weight: 800;
          font-size: 1rem;
          color: var(--text-secondary);
          width: 60px;
        }

        .name-cell-wrapper {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .table-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--bg-elevated);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .points-cell {
          font-weight: 800;
          color: var(--green-light);
          font-size: 1rem;
        }
      `}</style>

      <div className="leaderboard-header">
        <h1 className="dashboard-greeting">Leaderboard Kompetisi</h1>
        <p className="dashboard-date">
          Saling bersaing mengumpulkan poin promosi sosial media di wilayah Kalimantan.
        </p>
      </div>

      {/* Tabs */}
      <div className="tab-menu">
        <button
          className={`tab-btn ${activeTab === 'individu' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('individu')}
        >
          Peringkat Karyawan
        </button>
        <button
          className={`tab-btn ${activeTab === 'cabang' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('cabang')}
        >
          Peringkat Cabang
        </button>
      </div>

      {/* Podium Top 3 */}
      {topThree.length > 0 && (
        <div className="podium-container">
          {/* 1st Place */}
          {topThree[0] && (
            <div className="podium-card podium-card--1st animate-scale-in">
              <div className="podium-rank-badge podium-rank-badge--1st">1</div>
              <div className="podium-avatar">
                {activeTab === 'individu' ? getInitials(topThree[0].nama) : '🏢'}
              </div>
              <div className="podium-name">{topThree[0].nama}</div>
              <div className="podium-sub">
                {activeTab === 'individu' ? `Cabang: ${topThree[0].cabang}` : 'Kantor Cabang'}
              </div>
              <div className="podium-points">{topThree[0].totalPoints} Poin</div>
              {activeTab === 'individu' && (
                <div
                  style={{
                    fontSize: '0.6875rem',
                    color: getBadgeInfo(topThree[0].totalPoints).color,
                    fontWeight: 700,
                    marginTop: 'var(--spacing-xs)',
                  }}
                >
                  {getBadgeInfo(topThree[0].totalPoints).icon} {getBadgeInfo(topThree[0].totalPoints).label}
                </div>
              )}
            </div>
          )}

          {/* 2nd Place */}
          {topThree[1] && (
            <div className="podium-card podium-card--2nd animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <div className="podium-rank-badge podium-rank-badge--2nd">2</div>
              <div className="podium-avatar">
                {activeTab === 'individu' ? getInitials(topThree[1].nama) : '🏢'}
              </div>
              <div className="podium-name">{topThree[1].nama}</div>
              <div className="podium-sub">
                {activeTab === 'individu' ? `Cabang: ${topThree[1].cabang}` : 'Kantor Cabang'}
              </div>
              <div className="podium-points">{topThree[1].totalPoints} Poin</div>
              {activeTab === 'individu' && (
                <div
                  style={{
                    fontSize: '0.6875rem',
                    color: getBadgeInfo(topThree[1].totalPoints).color,
                    fontWeight: 700,
                    marginTop: 'var(--spacing-xs)',
                  }}
                >
                  {getBadgeInfo(topThree[1].totalPoints).icon} {getBadgeInfo(topThree[1].totalPoints).label}
                </div>
              )}
            </div>
          )}

          {/* 3rd Place */}
          {topThree[2] && (
            <div className="podium-card podium-card--3rd animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <div className="podium-rank-badge podium-rank-badge--3rd">3</div>
              <div className="podium-avatar">
                {activeTab === 'individu' ? getInitials(topThree[2].nama) : '🏢'}
              </div>
              <div className="podium-name">{topThree[2].nama}</div>
              <div className="podium-sub">
                {activeTab === 'individu' ? `Cabang: ${topThree[2].cabang}` : 'Kantor Cabang'}
              </div>
              <div className="podium-points">{topThree[2].totalPoints} Poin</div>
              {activeTab === 'individu' && (
                <div
                  style={{
                    fontSize: '0.6875rem',
                    color: getBadgeInfo(topThree[2].totalPoints).color,
                    fontWeight: 700,
                    marginTop: 'var(--spacing-xs)',
                  }}
                >
                  {getBadgeInfo(topThree[2].totalPoints).icon} {getBadgeInfo(topThree[2].totalPoints).label}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Remaining List */}
      <div className="table-wrapper animate-fade-in" style={{ animationDelay: '300ms' }}>
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th className="rank-cell">No</th>
              <th>{activeTab === 'individu' ? 'Nama Karyawan' : 'Nama Kantor Cabang'}</th>
              {activeTab === 'individu' && <th>Cabang</th>}
              <th>Peringkat Poin</th>
            </tr>
          </thead>
          <tbody>
            {list.length > 0 ? (
              list.map((item, index) => {
                const rank = index + 1
                const isTopThree = rank <= 3
                return (
                  <tr key={item.id}>
                    <td className="rank-cell" style={{ color: isTopThree ? 'var(--gold-400)' : 'var(--text-secondary)' }}>
                      {rank}
                    </td>
                    <td>
                      <div className="name-cell-wrapper">
                        <div className="table-avatar">
                          {activeTab === 'individu' ? getInitials(item.nama) : '🏢'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{item.nama}</div>
                          {activeTab === 'individu' && (
                            <div
                              style={{
                                fontSize: '0.6875rem',
                                color: getBadgeInfo(item.totalPoints).color,
                                fontWeight: 700,
                                marginTop: '2px',
                              }}
                            >
                              {getBadgeInfo(item.totalPoints).icon} {getBadgeInfo(item.totalPoints).label}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {activeTab === 'individu' && <td>{item.cabang}</td>}
                    <td className="points-cell">{item.totalPoints} Poin</td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={activeTab === 'individu' ? 4 : 3} style={{ padding: 'var(--spacing-3xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Papan peringkat masih kosong. Kumpulkan poin pertamamu sekarang!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
