'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AnalyticsOverview,
  AdvocateData,
  getAnalyticsData,
  syncAllKanwilEngagement,
  updateCampaignDestinationUrl,
  verifyKanwilBioLinks,
} from './actions'

type AnalitikClientProps = {
  initialData: AnalyticsOverview
}

export default function AnalitikClient({ initialData }: AnalitikClientProps) {
  const router = useRouter()
  const [data, setData] = useState<AnalyticsOverview>(initialData)
  const [selectedCabang, setSelectedCabang] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'advocates' | 'posts' | 'branches'>('advocates')
  const [advocateSort, setAdvocateSort] = useState<'likes' | 'er' | 'views' | 'clicks' | 'posts'>('likes')
  const [postSort, setPostSort] = useState<'likes' | 'views' | 'recent'>('likes')

  // Modal State untuk Deep-Dive Karyawan
  const [selectedAdvocate, setSelectedAdvocate] = useState<AdvocateData | null>(null)

  // Modal / Panel State untuk Pengaturan Destination URL
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false)
  const [destinationUrlInput, setDestinationUrlInput] = useState<string>(initialData.summary.activeDestinationUrl || 'https://www.pegadaian.co.id/produk/tabungan-emas')
  const [campaignNameInput, setCampaignNameInput] = useState<string>(initialData.summary.activeCampaignName || 'Promo Tabungan Emas Pegadaian')
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false)

  const [isPending, startTransition] = useTransition()
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [isCheckingBio, setIsCheckingBio] = useState<boolean>(false)
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copiedLink, setCopiedLink] = useState<boolean>(false)

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
        setSyncMessage({ type: 'success', text: res.message || 'Sinkronisasi postingan berhasil!' })
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

  // Handle Verifikasi Bio Links Karyawan
  const handleVerifyBioLinks = async () => {
    if (isCheckingBio) return
    setIsCheckingBio(true)
    setSyncMessage(null)

    try {
      const res = await verifyKanwilBioLinks(selectedCabang)
      if (res.success) {
        setSyncMessage({ type: 'success', text: res.message || 'Verifikasi bio link berhasil!' })
        const refreshed = await getAnalyticsData(selectedCabang)
        if (refreshed.success && refreshed.data) {
          setData(refreshed.data)
        }
      } else {
        setSyncMessage({ type: 'error', text: res.error || 'Gagal memeriksa bio link.' })
      }
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err.message || 'Terjadi kesalahan sistem.' })
    } finally {
      setIsCheckingBio(false)
    }
  }

  // Handle Simpan Destination URL
  const handleSaveDestinationUrl = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingSettings(true)
    try {
      const res = await updateCampaignDestinationUrl(destinationUrlInput, campaignNameInput)
      if (res.success) {
        setSyncMessage({ type: 'success', text: res.message || 'Destination URL berhasil diperbarui!' })
        setShowSettingsModal(false)
        const refreshed = await getAnalyticsData(selectedCabang)
        if (refreshed.success && refreshed.data) {
          setData(refreshed.data)
        }
      } else {
        setSyncMessage({ type: 'error', text: res.error || 'Gagal menyimpan URL tujuan.' })
      }
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err.message || 'Terjadi kesalahan sistem.' })
    } finally {
      setIsSavingSettings(false)
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
      if (advocateSort === 'er') return b.engagementRate - a.engagementRate
      if (advocateSort === 'views') return b.totalViews - a.totalViews
      if (advocateSort === 'clicks') return b.totalClicks - a.totalClicks
      if (advocateSort === 'posts') return b.totalPosts - a.totalPosts
      return b.totalLikes - a.totalLikes
    })

  // Filter dan Sort Top Posts
  const sortedTopPosts = [...data.topPosts].sort((a, b) => {
    if (postSort === 'views') return b.views - a.views
    if (postSort === 'recent') return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    return (b.likes + b.comments) - (a.likes + a.comments)
  })

  // Format tanggal sinkronisasi
  const formatSyncTime = (isoString: string | null) => {
    if (!isoString) return 'Belum pernah disinkronkan'
    try {
      const d = new Date(isoString)
      return (
        d.toLocaleString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) + ' WIB'
      )
    } catch {
      return isoString
    }
  }

  const { summary } = data

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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
        className="animate-fade-in"
      >
        <div>
          <h1 className="dashboard-greeting" style={{ margin: 0 }}>📈 Data Analitik & Konversi Leads</h1>
          <p style={{ marginTop: '4px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Pantau interaksi media sosial (Likes, Views), status link di Bio Instagram, dan total klik calon nasabah per karyawan.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="btn btn--secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.625rem 1rem',
              fontWeight: 600,
              fontSize: '0.8125rem',
            }}
          >
            ⚙️ Atur Destination URL
          </button>

          <button
            onClick={handleVerifyBioLinks}
            disabled={isCheckingBio || isPending}
            className="btn btn--secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.625rem 1rem',
              fontWeight: 600,
              fontSize: '0.8125rem',
            }}
          >
            🔍 {isCheckingBio ? 'Memeriksa Bio IG...' : 'Cek Link Bio'}
          </button>

          <button
            onClick={handleGlobalSync}
            disabled={isSyncing || isPending}
            className="btn btn--primary"
            style={{
              background: isSyncing
                ? 'var(--bg-tertiary)'
                : 'linear-gradient(135deg, var(--green-primary) 0%, #006837 100%)',
              border: '1px solid var(--border-gold)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.625rem 1.25rem',
              fontWeight: 600,
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                transform: isSyncing ? 'rotate(360deg)' : 'none',
                transition: isSyncing ? 'transform 1s linear infinite' : 'none',
              }}
            >
              🔄
            </span>
            {isSyncing ? 'Menyinkronkan...' : 'Sync Seluruh Engagement'}
          </button>
        </div>
      </div>

      {/* Active Campaign Info Pill */}
      <div
        className="card animate-fade-in"
        style={{
          padding: '0.75rem 1.25rem',
          marginBottom: '1.25rem',
          background: 'rgba(0, 107, 63, 0.08)',
          border: '1px solid rgba(117, 192, 68, 0.25)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.25rem' }}>🎯</span>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Tujuan Pengalihan Tautan Aktif (Destination URL):
            </span>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--gold-primary)' }}>
              {summary.activeCampaignName || 'Promo Tabungan Emas'} ➔{' '}
              <a
                href={summary.activeDestinationUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--text-primary)', textDecoration: 'underline', fontWeight: 500 }}
              >
                {summary.activeDestinationUrl}
              </a>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowSettingsModal(true)}
          style={{
            background: 'none',
            border: '1px solid var(--border-gold)',
            color: 'var(--gold-primary)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Ubah URL Tujuan ↗
        </button>
      </div>

      {/* Sync Alert Banner */}
      {syncMessage && (
        <div
          className="animate-fade-in"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
            background:
              syncMessage.type === 'success' ? 'rgba(0, 186, 136, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${syncMessage.type === 'success' ? 'var(--green-light)' : '#ef4444'}`,
            color: syncMessage.type === 'success' ? 'var(--green-light)' : '#fca5a5',
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{syncMessage.text}</span>
          <button
            onClick={() => setSyncMessage(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Cabang & Search Controls */}
      <div
        className="card animate-fade-in"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'var(--gradient-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            🏢 Filter Cabang:
          </label>
          <select
            value={selectedCabang}
            onChange={(e) => handleCabangChange(e.target.value)}
            disabled={isPending}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              minWidth: '200px',
            }}
          >
            <option value="all">Semua Cabang di Wilayah</option>
            {data.cabangList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nama}
              </option>
            ))}
          </select>
          {isPending && <span style={{ fontSize: '0.8125rem', color: 'var(--gold-primary)' }}>Memuat data...</span>}
        </div>

        <div style={{ minWidth: '240px' }}>
          <input
            type="text"
            placeholder="🔍 Cari nama, NIP, handle IG..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
            }}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5 EXECUTIVE SUMMARY KPI CARDS                                             */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.75rem',
        }}
        className="animate-fade-in"
      >
        {/* KPI 1: Potential Reach */}
        <div
          className="card stat-card"
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid #3b82f6',
            background: 'var(--gradient-card)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Potential Reach
              </div>
              <div style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--text-primary)', margin: '6px 0 2px' }}>
                {summary.totalPotentialReach.toLocaleString('id-ID')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Estimasi audiens terpapar
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', opacity: 0.8 }}>👥</div>
          </div>
          <div style={{ marginTop: '10px' }}>
            <span style={{ fontSize: '0.6875rem', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
              Jangkauan Organik
            </span>
          </div>
        </div>

        {/* KPI 2: Average Engagement Rate */}
        <div
          className="card stat-card"
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid var(--gold-primary)',
            background: 'var(--gradient-card)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Avg. Engagement Rate
              </div>
              <div style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--gold-primary)', margin: '6px 0 2px' }}>
                {summary.avgEngagementRate}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {summary.totalLikes.toLocaleString('id-ID')} Likes · {summary.totalComments.toLocaleString('id-ID')} Komentar
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', opacity: 0.8 }}>⚡</div>
          </div>
          <div style={{ marginTop: '10px' }}>
            <span
              style={{
                fontSize: '0.6875rem',
                background: summary.avgEngagementRate >= 5 ? 'rgba(0, 186, 136, 0.15)' : 'rgba(217, 119, 6, 0.15)',
                color: summary.avgEngagementRate >= 5 ? 'var(--green-light)' : 'var(--gold-primary)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600,
              }}
            >
              {summary.avgEngagementRate >= 5 ? '🔥 Sangat Aktif' : summary.avgEngagementRate >= 2 ? '✨ Optimal' : '🌱 Berkembang'}
            </span>
          </div>
        </div>

        {/* KPI 3: Total Link Clicks & Bio Status */}
        <div
          className="card stat-card"
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid #ec4899',
            background: 'var(--gradient-card)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Klik Tautan Nasabah
              </div>
              <div style={{ fontSize: '1.625rem', fontWeight: 800, color: '#f472b6', margin: '6px 0 2px' }}>
                {summary.totalLinkClicks.toLocaleString('id-ID')} <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Klik</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {summary.bioLinkActiveAdvocates} dari {summary.totalAdvocates} pasang di Bio IG
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', opacity: 0.8 }}>🔗</div>
          </div>
          <div style={{ marginTop: '10px' }}>
            <span style={{ fontSize: '0.6875rem', background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
              {summary.bioLinkActiveRate}% Kepatuhan Bio
            </span>
          </div>
        </div>

        {/* KPI 4: Total Video Views */}
        <div
          className="card stat-card"
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid var(--green-light)',
            background: 'var(--gradient-card)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Total Views
              </div>
              <div style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--text-primary)', margin: '6px 0 2px' }}>
                {summary.totalViews.toLocaleString('id-ID')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Dari {summary.totalPosts} postingan
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', opacity: 0.8 }}>🎬</div>
          </div>
          <div style={{ marginTop: '10px' }}>
            <span style={{ fontSize: '0.6875rem', background: 'rgba(0, 186, 136, 0.15)', color: 'var(--green-light)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
              Avg. {summary.avgViewsPerPost} views/post
            </span>
          </div>
        </div>

        {/* KPI 5: Advocacy Participation Rate */}
        <div
          className="card stat-card"
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid #8b5cf6',
            background: 'var(--gradient-card)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Advocacy Rate
              </div>
              <div style={{ fontSize: '1.625rem', fontWeight: 800, color: '#a78bfa', margin: '6px 0 2px' }}>
                {summary.advocacyParticipationRate}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {summary.totalAdvocates}/{summary.totalEmployees} karyawan aktif
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', opacity: 0.8 }}>🎯</div>
          </div>
          <div style={{ marginTop: '10px', width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(summary.advocacyParticipationRate, 100)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #8b5cf6 0%, #c084fc 100%)',
                borderRadius: '3px',
              }}
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3 TABS NAVIGATION                                                         */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-default)',
          marginBottom: '1.5rem',
        }}
        className="animate-fade-in"
      >
        <button
          onClick={() => setActiveTab('advocates')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'advocates' ? '3px solid var(--gold-primary)' : '3px solid transparent',
            color: activeTab === 'advocates' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'advocates' ? 700 : 500,
            fontSize: '0.9375rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>🌟 Performa Influencer & Bio Link</span>
          <span
            style={{
              fontSize: '0.75rem',
              background: activeTab === 'advocates' ? 'rgba(217, 119, 6, 0.2)' : 'var(--bg-secondary)',
              color: activeTab === 'advocates' ? 'var(--gold-primary)' : 'var(--text-muted)',
              padding: '2px 8px',
              borderRadius: '10px',
            }}
          >
            {filteredAdvocates.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('posts')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'posts' ? '3px solid var(--green-light)' : '3px solid transparent',
            color: activeTab === 'posts' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'posts' ? 700 : 500,
            fontSize: '0.9375rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>🖼️ Galeri Postingan Terbaik</span>
          <span
            style={{
              fontSize: '0.75rem',
              background: activeTab === 'posts' ? 'rgba(0, 186, 136, 0.2)' : 'var(--bg-secondary)',
              color: activeTab === 'posts' ? 'var(--green-light)' : 'var(--text-muted)',
              padding: '2px 8px',
              borderRadius: '10px',
            }}
          >
            {data.topPosts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('branches')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'branches' ? '3px solid #3b82f6' : '3px solid transparent',
            color: activeTab === 'branches' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'branches' ? 700 : 500,
            fontSize: '0.9375rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>🏢 Komparasi Kinerja Cabang</span>
          <span
            style={{
              fontSize: '0.75rem',
              background: activeTab === 'branches' ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-secondary)',
              color: activeTab === 'branches' ? '#60a5fa' : 'var(--text-muted)',
              padding: '2px 8px',
              borderRadius: '10px',
            }}
          >
            {data.branches.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TABEL ADVOKATOR, BIO LINK STATUS & MODAL DEEP-DIVE                 */}
      {/* ========================================================================= */}
      {activeTab === 'advocates' && (
        <div className="card animate-fade-in" style={{ padding: '1.25rem', background: 'var(--gradient-card)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Tabel Advokator, Status Bio Link & Konversi Leads
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Klik pada nama karyawan untuk membuka profil detail dan galeri konten promosi.
              </p>
            </div>

            {/* Sort Filter Buttons */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Urutkan:</span>
              <button
                onClick={() => setAdvocateSort('likes')}
                className={`btn btn--sm ${advocateSort === 'likes' ? 'btn--primary' : 'btn--secondary'}`}
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              >
                ❤️ Likes
              </button>
              <button
                onClick={() => setAdvocateSort('clicks')}
                className={`btn btn--sm ${advocateSort === 'clicks' ? 'btn--primary' : 'btn--secondary'}`}
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              >
                🔗 Klik Nasabah
              </button>
              <button
                onClick={() => setAdvocateSort('er')}
                className={`btn btn--sm ${advocateSort === 'er' ? 'btn--primary' : 'btn--secondary'}`}
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              >
                ⚡ ER% Score
              </button>
              <button
                onClick={() => setAdvocateSort('views')}
                className={`btn btn--sm ${advocateSort === 'views' ? 'btn--primary' : 'btn--secondary'}`}
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              >
                👁️ Views
              </button>
              <button
                onClick={() => setAdvocateSort('posts')}
                className={`btn btn--sm ${advocateSort === 'posts' ? 'btn--primary' : 'btn--secondary'}`}
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              >
                📝 Post
              </button>
            </div>
          </div>

          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}># Rank</th>
                  <th style={{ padding: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Karyawan</th>
                  <th style={{ padding: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Cabang</th>
                  <th style={{ padding: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Akun Instagram</th>
                  <th style={{ padding: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Link Bio IG</th>
                  <th style={{ padding: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Klik Leads</th>
                  <th style={{ padding: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Total Post</th>
                  <th style={{ padding: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', textAlign: 'right' }}>Total Likes</th>
                  <th style={{ padding: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', textAlign: 'center' }}>ER Score</th>
                  <th style={{ padding: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdvocates.length > 0 ? (
                  filteredAdvocates.map((adv, idx) => (
                    <tr
                      key={adv.id}
                      onClick={() => setSelectedAdvocate(adv)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '0.875rem 0.75rem', fontWeight: 700, color: idx < 3 ? 'var(--gold-primary)' : 'var(--text-muted)' }}>
                        {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `${idx + 1}`}
                      </td>
                      <td style={{ padding: '0.875rem 0.75rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                          {adv.nama}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          NIP: {adv.nip}
                        </div>
                      </td>
                      <td style={{ padding: '0.875rem 0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {adv.cabangNama}
                      </td>
                      <td style={{ padding: '0.875rem 0.75rem' }}>
                        {adv.handle !== '-' ? (
                          <a
                            href={`https://instagram.com/${adv.handle.replace(/^@/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: '#e1306c', fontWeight: 600, fontSize: '0.8125rem', textDecoration: 'none' }}
                          >
                            @{adv.handle.replace(/^@/, '')} ↗
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center' }}>
                        {adv.isBioLinkActive ? (
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '10px',
                              background: 'rgba(0, 186, 136, 0.15)',
                              color: 'var(--green-light)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            ✅ Terpasang
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '10px',
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: '#f87171',
                            }}
                          >
                            ❌ Belum
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center', fontWeight: 700, color: adv.totalClicks > 0 ? '#f472b6' : 'var(--text-muted)' }}>
                        {adv.totalClicks > 0 ? `🔗 ${adv.totalClicks}` : '0'}
                      </td>
                      <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {adv.totalPosts}
                      </td>
                      <td style={{ padding: '0.875rem 0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--gold-primary)' }}>
                        {adv.totalLikes.toLocaleString('id-ID')}
                      </td>
                      <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background:
                              adv.erRating === 'High'
                                ? 'rgba(0, 186, 136, 0.15)'
                                : adv.erRating === 'Good'
                                ? 'rgba(217, 119, 6, 0.15)'
                                : 'rgba(100, 116, 139, 0.15)',
                            color:
                              adv.erRating === 'High'
                                ? 'var(--green-light)'
                                : adv.erRating === 'Good'
                                ? 'var(--gold-primary)'
                                : '#94a3b8',
                          }}
                        >
                          {adv.engagementRate}% ({adv.erRating})
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedAdvocate(adv)
                          }}
                          className="btn btn--secondary btn--sm"
                          style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                        >
                          Lihat Detail 🔍
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      Tidak ada data advokator yang sesuai dengan pencarian atau filter cabang ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GALERI POSTINGAN TERBAIK (TOP CONTENT HUB)                         */}
      {/* ========================================================================= */}
      {activeTab === 'posts' && (
        <div className="animate-fade-in">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Galeri Konten Promosi Terbaik Wilayah
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Postingan karyawan dengan performa likes, views, dan komentar teratas.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Sortir:</span>
              <button
                onClick={() => setPostSort('likes')}
                className={`btn btn--sm ${postSort === 'likes' ? 'btn--primary' : 'btn--secondary'}`}
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              >
                ❤️ Paling Disukai
              </button>
              <button
                onClick={() => setPostSort('views')}
                className={`btn btn--sm ${postSort === 'views' ? 'btn--primary' : 'btn--secondary'}`}
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              >
                👁️ Views Terbanyak
              </button>
              <button
                onClick={() => setPostSort('recent')}
                className={`btn btn--sm ${postSort === 'recent' ? 'btn--primary' : 'btn--secondary'}`}
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              >
                🕒 Paling Baru
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {sortedTopPosts.length > 0 ? (
              sortedTopPosts.map((p, idx) => (
                <div
                  key={p.id}
                  className="card"
                  style={{
                    padding: '1.25rem',
                    background: 'var(--gradient-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderRadius: 'var(--radius-lg)',
                    border: idx === 0 ? '1px solid var(--gold-primary)' : '1px solid var(--border-default)',
                    boxShadow: idx === 0 ? '0 0 15px rgba(217, 119, 6, 0.15)' : 'var(--shadow-md)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--green-primary), var(--gold-primary))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: '#fff',
                            fontSize: '0.875rem',
                          }}
                        >
                          {p.employeeNama.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                            {p.employeeNama}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {p.cabangNama} · {p.handle !== '-' ? `@${p.handle.replace(/^@/, '')}` : ''}
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '0.6875rem',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: 'rgba(225, 48, 108, 0.15)',
                          color: '#f43f5e',
                          fontWeight: 700,
                        }}
                      >
                        📸 Instagram
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--text-secondary)',
                        lineHeight: '1.5',
                        background: 'var(--bg-secondary)',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '1rem',
                        minHeight: '60px',
                        maxHeight: '90px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {p.captionText || 'Tidak ada teks caption.'}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-around',
                        background: 'rgba(0, 0, 0, 0.2)',
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '0.875rem',
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Likes</div>
                        <div style={{ fontWeight: 700, color: '#f43f5e', fontSize: '0.875rem' }}>
                          ❤️ {p.likes.toLocaleString('id-ID')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Komentar</div>
                        <div style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.875rem' }}>
                          💬 {p.comments.toLocaleString('id-ID')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Views</div>
                        <div style={{ fontWeight: 700, color: 'var(--green-light)', fontSize: '0.875rem' }}>
                          👁️ {p.views.toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>

                    <a
                      href={p.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn--secondary"
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        display: 'block',
                        fontSize: '0.75rem',
                        padding: '0.5rem',
                        textDecoration: 'none',
                      }}
                    >
                      Buka di Instagram ↗️
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                Belum ada postingan terverifikasi yang tersedia.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: KOMPARASI KINERJA CABANG (BRANCH BREAKDOWN)                        */}
      {/* ========================================================================= */}
      {activeTab === 'branches' && (
        <div className="card animate-fade-in" style={{ padding: '1.25rem', background: 'var(--gradient-card)' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Komparasi Kinerja Advokasi Antar Cabang
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Menganalisis tingkat partisipasi karyawan dan total engagement yang dihasilkan masing-masing unit kerja.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {data.branches.length > 0 ? (
              data.branches.map((b, idx) => (
                <div
                  key={b.id}
                  style={{
                    padding: '1.25rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    border: idx === 0 ? '1px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          color: idx === 0 ? 'var(--gold-primary)' : 'var(--text-muted)',
                        }}
                      >
                        RANK #{idx + 1}
                      </span>
                      <h4 style={{ margin: '2px 0 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {b.nama}
                      </h4>
                    </div>
                    {idx === 0 && (
                      <span style={{ fontSize: '0.6875rem', background: 'rgba(217, 119, 6, 0.2)', color: 'var(--gold-primary)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                        🏆 Top Branch
                      </span>
                    )}
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      <span>Partisipasi Karyawan:</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {b.advocateCount} dari {b.totalEmployeesInBranch} ({b.participationRate}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(b.participationRate, 100)}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, var(--green-primary), var(--green-light))',
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      padding: '0.625rem',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Posts</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                        {b.totalPosts}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Likes</div>
                      <div style={{ fontWeight: 700, color: 'var(--gold-primary)', fontSize: '0.875rem' }}>
                        {b.totalLikes.toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Views</div>
                      <div style={{ fontWeight: 700, color: 'var(--green-light)', fontSize: '0.875rem' }}>
                        {b.totalViews.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Tidak ada data cabang yang tersedia.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PENGATURAN DESTINATION URL                                          */}
      {/* ========================================================================= */}
      {showSettingsModal && (
        <div
          className="modal-backdrop animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className="modal-card animate-scale-in"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-gold)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '560px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.5rem' }}>⚙️</span>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Pengaturan Tujuan Pengalihan (Destination URL)
                </h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: 'none',
                  color: 'var(--text-primary)',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1.25rem' }}>
              Ubah link tujuan promosi kapan saja. Seluruh tautan di bio karyawan (<code>/r/[handle]</code>) akan otomatis diarahkan ke URL tujuan baru di bawah ini.
            </p>

            <form onSubmit={handleSaveDestinationUrl}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Nama Kampanye / Promo:
                </label>
                <input
                  type="text"
                  value={campaignNameInput}
                  onChange={(e) => setCampaignNameInput(e.target.value)}
                  placeholder="Misal: Promo Tabungan Emas / Download Pegadaian Digital"
                  required
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  URL Tujuan Pengalihan (Wajib https://):
                </label>
                <input
                  type="url"
                  value={destinationUrlInput}
                  onChange={(e) => setDestinationUrlInput(e.target.value)}
                  placeholder="https://www.pegadaian.co.id/produk/tabungan-emas"
                  required
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Bisa berupa link web Pegadaian, link download Play Store / App Store, atau video YouTube.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="btn btn--secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="btn btn--primary"
                  style={{
                    background: 'linear-gradient(135deg, var(--green-primary), #006837)',
                    border: '1px solid var(--border-gold)',
                    fontWeight: 700,
                  }}
                >
                  {isSavingSettings ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DEEP-DIVE PROFIL & KONTEN KARYAWAN                                  */}
      {/* ========================================================================= */}
      {selectedAdvocate && (
        <div
          className="modal-backdrop animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setSelectedAdvocate(null)}
        >
          <div
            className="modal-card animate-scale-in"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--green-primary), var(--gold-primary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.5rem',
                    color: '#fff',
                    boxShadow: '0 0 12px rgba(117, 192, 68, 0.3)',
                  }}
                >
                  {selectedAdvocate.nama.charAt(0)}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {selectedAdvocate.nama}
                  </h2>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    NIP: {selectedAdvocate.nip} · {selectedAdvocate.cabangNama}
                  </div>
                  {selectedAdvocate.handle !== '-' && (
                    <a
                      href={`https://instagram.com/${selectedAdvocate.handle.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#e1306c', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginTop: '4px' }}
                    >
                      📸 @{selectedAdvocate.handle.replace(/^@/, '')} ↗
                    </a>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedAdvocate(null)}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Smart Referral Link Box for this employee */}
            {selectedAdvocate.handle !== '-' && (
              <div
                style={{
                  padding: '1rem',
                  background: 'rgba(0, 107, 63, 0.08)',
                  border: '1px solid rgba(117, 192, 68, 0.25)',
                  borderRadius: 'var(--radius-lg)',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--green-light)', textTransform: 'uppercase' }}>
                    🔗 Tautan Bio Promosi Karyawan Ini:
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'monospace' }}>
                    {typeof window !== 'undefined' ? window.location.origin : 'https://irs.pegadaian.co.id'}/r/{selectedAdvocate.handle.replace(/^@/, '')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Status di Bio IG:{' '}
                    {selectedAdvocate.isBioLinkActive ? (
                      <span style={{ color: 'var(--green-light)', fontWeight: 700 }}>✅ Terpasang</span>
                    ) : (
                      <span style={{ color: '#f87171', fontWeight: 600 }}>❌ Belum Terdeteksi</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/r/${selectedAdvocate.handle.replace(/^@/, '')}`
                      navigator.clipboard.writeText(link)
                      setCopiedLink(true)
                      setTimeout(() => setCopiedLink(false), 2000)
                    }}
                    className="btn btn--secondary btn--sm"
                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                  >
                    {copiedLink ? '✅ Tersalin!' : '📋 Salin Tautan'}
                  </button>
                  <a
                    href={`/r/${selectedAdvocate.handle.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn--primary btn--sm"
                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                  >
                    Uji Klik ↗
                  </a>
                </div>
              </div>
            )}

            {/* Advocate Performance Metric Chips */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ padding: '0.875rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Klik Leads Nasabah</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f472b6', marginTop: '2px' }}>
                  🔗 {selectedAdvocate.totalClicks}
                </div>
              </div>

              <div style={{ padding: '0.875rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Postingan</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {selectedAdvocate.totalPosts}
                </div>
              </div>

              <div style={{ padding: '0.875rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Suka (Likes)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gold-primary)', marginTop: '2px' }}>
                  {selectedAdvocate.totalLikes.toLocaleString('id-ID')}
                </div>
              </div>

              <div style={{ padding: '0.875rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Views</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--green-light)', marginTop: '2px' }}>
                  {selectedAdvocate.totalViews.toLocaleString('id-ID')}
                </div>
              </div>

              <div style={{ padding: '0.875rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Engagement Rate</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                  {selectedAdvocate.engagementRate}%
                </div>
              </div>
            </div>

            {/* Section: Galeri Postingan Karyawan */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  📸 Riwayat Konten Promosi Terverifikasi ({selectedAdvocate.posts.length})
                </h3>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1rem',
                }}
              >
                {selectedAdvocate.posts.length > 0 ? (
                  selectedAdvocate.posts.map((post) => (
                    <div
                      key={post.id}
                      style={{
                        padding: '1rem',
                        background: 'var(--bg-primary)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.6875rem', background: 'rgba(0, 186, 136, 0.15)', color: 'var(--green-light)', padding: '2px 6px', borderRadius: '6px', fontWeight: 600 }}>
                            {post.contentTypeNama || 'Konten Promosi'}
                          </span>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            {new Date(post.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>

                        <p
                          style={{
                            fontSize: '0.8125rem',
                            color: 'var(--text-secondary)',
                            lineHeight: '1.4',
                            margin: '8px 0',
                            minHeight: '45px',
                            maxHeight: '65px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {post.captionText || 'Tidak ada teks caption.'}
                        </p>
                      </div>

                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.75rem',
                            padding: '6px 0',
                            borderTop: '1px solid var(--border-subtle)',
                            marginBottom: '8px',
                          }}
                        >
                          <span style={{ color: '#f43f5e', fontWeight: 600 }}>❤️ {post.likes}</span>
                          <span style={{ color: '#38bdf8', fontWeight: 600 }}>💬 {post.comments}</span>
                          <span style={{ color: 'var(--green-light)', fontWeight: 600 }}>👁️ {post.views}</span>
                        </div>

                        <a
                          href={post.postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn--secondary"
                          style={{
                            width: '100%',
                            textAlign: 'center',
                            display: 'block',
                            fontSize: '0.75rem',
                            padding: '4px',
                            textDecoration: 'none',
                          }}
                        >
                          Buka di IG ↗
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                    Belum ada postingan untuk karyawan ini.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
