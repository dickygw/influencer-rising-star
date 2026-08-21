'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AnalyticsOverview, getAnalyticsData, syncAllKanwilEngagement } from './actions'

type AnalitikClientProps = {
  initialData: AnalyticsOverview
}

export default function AnalitikClient({ initialData }: AnalitikClientProps) {
  const router = useRouter()
  const [data, setData] = useState<AnalyticsOverview>(initialData)
  const [selectedCabang, setSelectedCabang] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'advocates' | 'posts' | 'branches'>('advocates')
  const [advocateSort, setAdvocateSort] = useState<'likes' | 'views' | 'posts'>('likes')

  const [isPending, startTransition] = useTransition()
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Handle pergantian filter cabang
  const handleCabangChange = (cabangId: string) => {
    setSelectedCabang(cabangId)
    startTransition(async () => {
      const res = await getAnalyticsData(cabangId)
      if (res.success && res.data) {
        setData(res.data)
      }
    })
  }

  // Handle Sync Massal ke Apify
  const handleGlobalSync = async () => {
    if (isSyncing) return
    setIsSyncing(true)
    setSyncMessage(null)

    try {
      const res = await syncAllKanwilEngagement(selectedCabang)
      if (res.success) {
        setSyncMessage({ type: 'success', text: res.message || 'Sinkronisasi berhasil!' })
        // Refresh data setelah sync
        const refreshed = await getAnalyticsData(selectedCabang)
        if (refreshed.success && refreshed.data) {
          setData(refreshed.data)
        }
      } else {
        setSyncMessage({ type: 'error', text: res.error || 'Gagal sinkronisasi data.' })
      }
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err.message || 'Terjadi kesalahan sistem.' })
    } finally {
      setIsSyncing(false)
    }
  }

  // Filter dan Sort Advokator
  const filteredAdvocates = data.advocates
    .filter(adv => {
      const matchSearch =
        adv.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adv.nip.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adv.handle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adv.cabangNama.toLowerCase().includes(searchTerm.toLowerCase())
      return matchSearch
    })
    .sort((a, b) => {
      if (advocateSort === 'likes') return b.totalLikes - a.totalLikes
      if (advocateSort === 'views') return b.totalViews - a.totalViews
      return b.totalPosts - a.totalPosts
    })

  // Format tanggal sinkronisasi
  const formatSyncTime = (isoString: string | null) => {
    if (!isoString) return 'Belum pernah disinkronkan'
    try {
      const d = new Date(isoString)
      return d.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' WIB'
    } catch {
      return isoString
    }
  }

  return (
    <div className="dashboard-content">
      {/* Breadcrumbs */}
      <div className="pea-breadcrumbs animate-fade-in">
        <span>IRS 2026</span>
        <span>/</span>
        <a href="/admin" onClick={(e) => { e.preventDefault(); router.push('/admin') }}>Admin</a>
        <span>/</span>
        <span>Data Analitik</span>
      </div>

      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }} className="animate-fade-in">
        <div>
          <h1 className="dashboard-greeting" style={{ margin: 0 }}>📈 Data Analitik Sosmed</h1>
          <p style={{ marginTop: '4px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Pantau performa interaksi (Likes, Views, Komentar) dan efektivitas advokasi seluruh karyawan wilayah.
          </p>
        </div>

        {/* Sync Global Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={handleGlobalSync}
            disabled={isSyncing || isPending}
            className="btn btn--primary"
            style={{
              background: isSyncing ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, var(--green-primary) 0%, #006837 100%)',
              border: '1px solid var(--border-gold)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.625rem 1.25rem',
              fontWeight: 600
            }}
          >
            <span style={{ display: 'inline-block', transform: isSyncing ? 'rotate(360deg)' : 'none', transition: isSyncing ? 'transform 1s linear infinite' : 'none' }}>
              🔄
            </span>
            {isSyncing ? 'Menyinkronkan dari Instagram...' : 'Sync Seluruh Engagement'}
          </button>
        </div>
      </div>

      {/* Sync Alert Banner */}
      {syncMessage && (
        <div
          className="animate-fade-in"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
            background: syncMessage.type === 'success' ? 'rgba(0, 186, 136, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${syncMessage.type === 'success' ? 'var(--green-light)' : '#ef4444'}`,
            color: syncMessage.type === 'success' ? 'var(--green-light)' : '#fca5a5',
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>{syncMessage.type === 'success' ? '✅' : '⚠️'} {syncMessage.text}</span>
          <button onClick={() => setSyncMessage(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Filter & Subheader Row */}
      <div 
        className="animate-fade-in" 
        style={{ 
          padding: '0.875rem 1.25rem', 
          borderRadius: 'var(--radius-xl)', 
          background: 'var(--bg-secondary)', 
          border: '1px solid var(--border-default)', 
          marginBottom: '1.5rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '1rem' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              🏢 Filter Cabang:
            </span>
            <select
              value={selectedCabang}
              onChange={(e) => handleCabangChange(e.target.value)}
              className="form-input"
              style={{ padding: '0.45rem 0.875rem', fontSize: '0.875rem', minWidth: '200px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              <option value="all">Semua Cabang (Kanwil)</option>
              {data.cabangList.map(c => (
                <option key={c.id} value={c.id}>{c.nama}</option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
            <span>🕒</span> Sinkronisasi Terakhir: <strong style={{ color: 'var(--text-secondary)' }}>{formatSyncTime(data.summary.lastSyncedAt)}</strong>
          </div>
        </div>

        {isPending && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--gold-400)', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>🌀</span> Memuat data...
          </span>
        )}
      </div>

      {/* Executive KPI Cards */}
      <div className="analytics-kpi-grid animate-scale-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {/* Card 1: Total Posts */}
        <div className="kpi-box" style={{ background: 'linear-gradient(145deg, rgba(0, 168, 89, 0.12) 0%, var(--bg-secondary) 100%)', border: '1px solid rgba(0, 168, 89, 0.3)', padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>Total Konten Terbit</div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {data.summary.totalPosts}
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', background: 'rgba(0, 168, 89, 0.2)', padding: '8px', borderRadius: '12px' }}>📝</div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--green-light)', marginTop: '8px', whiteSpace: 'nowrap' }}>
            Dari {data.summary.totalAdvocates} Influencer Aktif
          </div>
        </div>

        {/* Card 2: Total Likes */}
        <div className="kpi-box" style={{ background: 'linear-gradient(145deg, rgba(230, 184, 32, 0.12) 0%, var(--bg-secondary) 100%)', border: '1px solid rgba(230, 184, 32, 0.3)', padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>Total Akumulasi Likes</div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--gold-400)', marginTop: '4px' }}>
                {data.summary.totalLikes.toLocaleString('id-ID')}
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', background: 'rgba(230, 184, 32, 0.2)', padding: '8px', borderRadius: '12px' }}>👍</div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', whiteSpace: 'nowrap' }}>
            Rata-rata: <strong>{data.summary.avgLikesPerPost}</strong> like/konten
          </div>
        </div>

        {/* Card 3: Total Views */}
        <div className="kpi-box" style={{ background: 'linear-gradient(145deg, rgba(59, 130, 246, 0.12) 0%, var(--bg-secondary) 100%)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>Total Video Views</div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#60a5fa', marginTop: '4px' }}>
                {data.summary.totalViews.toLocaleString('id-ID')}
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', background: 'rgba(59, 130, 246, 0.2)', padding: '8px', borderRadius: '12px' }}>👁️</div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', whiteSpace: 'nowrap' }}>
            Tayangan Reels Publik
          </div>
        </div>

        {/* Card 4: Total Comments */}
        <div className="kpi-box" style={{ background: 'linear-gradient(145deg, rgba(168, 85, 247, 0.12) 0%, var(--bg-secondary) 100%)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>Total Komentar</div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#c084fc', marginTop: '4px' }}>
                {data.summary.totalComments.toLocaleString('id-ID')}
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', background: 'rgba(168, 85, 247, 0.2)', padding: '8px', borderRadius: '12px' }}>💬</div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', whiteSpace: 'nowrap' }}>
            Respon Komentar Publik
          </div>
        </div>
      </div>

      {/* Main Section with Tab Navigation */}
      <div className="card animate-fade-in" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-default)' }}>
        {/* Tab Headers */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-default)', paddingBottom: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('advocates')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: activeTab === 'advocates' ? 'var(--green-primary)' : 'transparent',
                color: activeTab === 'advocates' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              🏆 Top Influencer ({data.advocates.length})
            </button>

            <button
              onClick={() => setActiveTab('posts')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: activeTab === 'posts' ? 'var(--green-primary)' : 'transparent',
                color: activeTab === 'posts' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              🔥 Konten Terpopuler ({data.topPosts.length})
            </button>

            <button
              onClick={() => setActiveTab('branches')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: activeTab === 'branches' ? 'var(--green-primary)' : 'transparent',
                color: activeTab === 'branches' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              🏢 Performa Cabang ({data.branches.length})
            </button>
          </div>

          {/* Search box for Advocates tab */}
          {activeTab === 'advocates' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '200px' }}>
              <input
                type="text"
                placeholder="Cari nama, NIP, sosmed..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ padding: '0.45rem 0.875rem', fontSize: '0.8125rem', width: '240px', maxWidth: '100%', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
            </div>
          )}
        </div>

        {/* TAB 1: TOP ADVOKATOR */}
        {activeTab === 'advocates' && (
          <div>
            {/* Shadcn-style Segmented Control (Toggle Group) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(0, 0, 0, 0.25)', padding: '4px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', flexWrap: 'wrap', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', padding: '0 12px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  Urutkan:
                </span>
                <button
                  onClick={() => setAdvocateSort('likes')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: advocateSort === 'likes' ? 'var(--bg-card)' : 'transparent',
                    color: advocateSort === 'likes' ? 'var(--gold-400)' : 'var(--text-secondary)',
                    boxShadow: advocateSort === 'likes' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span>👍</span> Likes Terbanyak
                </button>
                <button
                  onClick={() => setAdvocateSort('views')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: advocateSort === 'views' ? 'var(--bg-card)' : 'transparent',
                    color: advocateSort === 'views' ? '#60a5fa' : 'var(--text-secondary)',
                    boxShadow: advocateSort === 'views' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span>👁️</span> Views Terbanyak
                </button>
                <button
                  onClick={() => setAdvocateSort('posts')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: advocateSort === 'posts' ? 'var(--bg-card)' : 'transparent',
                    color: advocateSort === 'posts' ? 'var(--green-light)' : 'var(--text-secondary)',
                    boxShadow: advocateSort === 'posts' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span>📝</span> Post Terbanyak
                </button>
              </div>

              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Menampilkan <strong>{filteredAdvocates.length}</strong> advokator
              </div>
            </div>

            {/* Shadcn UI Style Data Table */}
            <div className="shadcn-card">
              <div className="shadcn-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px', textAlign: 'center' }}>Rank</th>
                      <th style={{ minWidth: '240px' }}>Nama & NIP Karyawan</th>
                      <th style={{ minWidth: '160px' }}>Cabang</th>
                      <th style={{ minWidth: '180px' }}>Akun Instagram</th>
                      <th style={{ minWidth: '110px', textAlign: 'center' }}>Total Post</th>
                      <th style={{ minWidth: '120px', textAlign: 'center' }}>Total Likes</th>
                      <th style={{ minWidth: '120px', textAlign: 'center' }}>Total Views</th>
                      <th style={{ minWidth: '120px', textAlign: 'center' }}>Total Komentar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAdvocates.length > 0 ? (
                      filteredAdvocates.map((adv, index) => {
                        let rankBadge = null
                        if (index === 0) rankBadge = <span style={{ fontSize: '1.25rem' }}>🥇</span>
                        else if (index === 1) rankBadge = <span style={{ fontSize: '1.25rem' }}>🥈</span>
                        else if (index === 2) rankBadge = <span style={{ fontSize: '1.25rem' }}>🥉</span>
                        else {
                          rankBadge = (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'rgba(255,255,255,0.05)',
                              fontSize: '0.8125rem',
                              fontWeight: 600,
                              color: 'var(--text-muted)'
                            }}>
                              {index + 1}
                            </span>
                          )
                        }

                        // Avatar Initials
                        const initials = adv.nama
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map(w => w[0])
                          .join('')
                          .toUpperCase()

                        return (
                          <tr key={adv.id}>
                            <td style={{ textAlign: 'center' }}>
                              {rankBadge}
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, var(--green-primary) 0%, #0d6b36 100%)',
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '0.8125rem',
                                  flexShrink: 0,
                                  border: '1px solid var(--border-gold)'
                                }}>
                                  {initials}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{adv.nama}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NIP: {adv.nip}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{adv.cabangNama}</span>
                            </td>
                            <td>
                              {adv.handle !== '-' ? (
                                <a
                                  href={`https://instagram.com/${adv.handle.replace(/^@/, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '4px 10px',
                                    borderRadius: '9999px',
                                    background: 'rgba(225, 48, 108, 0.1)',
                                    border: '1px solid rgba(225, 48, 108, 0.25)',
                                    color: '#fb7185',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontWeight: 500,
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <span>📸</span>
                                  <span>@{adv.handle.replace(/^@/, '')}</span>
                                  <span style={{ fontSize: '0.6875rem', opacity: 0.7 }}>↗</span>
                                </a>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="metric-chip metric-chip--gray">
                                📝 {adv.totalPosts} Post
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="metric-chip metric-chip--gold">
                                👍 {adv.totalLikes.toLocaleString('id-ID')}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="metric-chip metric-chip--blue">
                                👁️ {adv.totalViews.toLocaleString('id-ID')}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="metric-chip metric-chip--purple">
                                💬 {adv.totalComments.toLocaleString('id-ID')}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                          🔍 Belum ada data advokator yang sesuai dengan kriteria filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KONTEN TERPOPULER (HALL OF FAME) */}
        {activeTab === 'posts' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {data.topPosts.length > 0 ? (
                data.topPosts.map((post, idx) => (
                  <div
                    key={post.id}
                    className="shadcn-card"
                    style={{
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      transition: 'transform 0.2s ease, border-color 0.2s ease'
                    }}
                  >
                    {/* Badge Rank */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: idx === 0 ? 'rgba(230, 184, 32, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                        color: idx === 0 ? 'var(--gold-400)' : 'var(--text-primary)',
                        border: idx === 0 ? '1px solid var(--border-gold)' : '1px solid var(--border-default)'
                      }}>
                        #{idx + 1} Konten Terfavorit
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(post.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Author info */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{post.employeeNama}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{post.cabangNama} • @{post.handle.replace(/^@/, '')}</div>
                    </div>

                    {/* Caption Preview */}
                    <div style={{
                      fontSize: '0.8125rem',
                      color: 'var(--text-secondary)',
                      background: 'rgba(0,0,0,0.25)',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '1rem',
                      fontStyle: 'italic',
                      maxHeight: '68px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      &ldquo;{post.captionText || '#IRS2026 #PegadaianAdvocacy'}&rdquo;
                    </div>

                    {/* Metrics Bar & Link */}
                    <div>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
                        <span className="metric-chip metric-chip--gold">
                          👍 {post.likes} Likes
                        </span>
                        <span className="metric-chip metric-chip--blue">
                          👁️ {post.views} Views
                        </span>
                        <span className="metric-chip metric-chip--purple">
                          💬 {post.comments} Komentar
                        </span>
                      </div>

                      <a
                        href={post.postUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn--outline"
                        style={{ width: '100%', textAlign: 'center', fontSize: '0.8125rem', padding: '0.5rem', textDecoration: 'none', display: 'block', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
                      >
                        Buka di Instagram ↗
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  Belum ada postingan terverifikasi yang tersedia.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PERFORMA CABANG */}
        {activeTab === 'branches' && (
          <div>
            <div className="shadcn-card">
              <div className="shadcn-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '70px', textAlign: 'center' }}>No</th>
                      <th style={{ minWidth: '220px' }}>Nama Kantor Cabang</th>
                      <th style={{ minWidth: '140px', textAlign: 'center' }}>Advokator Aktif</th>
                      <th style={{ minWidth: '130px', textAlign: 'center' }}>Total Postingan</th>
                      <th style={{ minWidth: '130px', textAlign: 'center' }}>Total Likes</th>
                      <th style={{ minWidth: '130px', textAlign: 'center' }}>Total Views</th>
                      <th style={{ minWidth: '200px' }}>Kontribusi Likes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.branches.length > 0 ? (
                      data.branches.map((b, idx) => {
                        const totalLikesAll = data.summary.totalLikes || 1
                        const pct = Math.min(100, Math.round((b.totalLikes / totalLikesAll) * 100))

                        return (
                          <tr key={b.id}>
                            <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>
                              {idx + 1}
                            </td>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {b.nama}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="metric-chip metric-chip--green">
                                👥 {b.advocateCount} Orang
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="metric-chip metric-chip--gray">
                                📝 {b.totalPosts} Post
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="metric-chip metric-chip--gold">
                                👍 {b.totalLikes.toLocaleString('id-ID')}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="metric-chip metric-chip--blue">
                                👁️ {b.totalViews.toLocaleString('id-ID')}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--gold-400) 0%, #fbbf24 100%)', height: '100%', borderRadius: '9999px' }} />
                                </div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '35px' }}>{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                          Belum ada data cabang yang tersedia.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

