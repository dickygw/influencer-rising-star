'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAdminDashboardSummary } from './actions'
import {
  IconCheckCircle,
  IconUsers,
  IconBarChart,
  IconChevronRight,
  IconFileText,
  IconTrophy,
} from '@/components/icons'

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
      <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
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
    <div className="admin-dashboard animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Hero Announcement Banner (MagangHub Style) */}
      <div
        className="hero-announcement"
        style={{
          background: 'linear-gradient(135deg, #0da94d 0%, #064e26 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.75rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(13, 169, 77, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          flexWrap: 'wrap',
          gap: '1.25rem',
        }}
      >
        <div style={{ maxWidth: '680px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Panel Pengawas Wilayah
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>IRS Pegadaian 2026</span>
          </div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.01em' }}>
            Pantau Advokasi Karyawan Wilayah Anda
          </h2>
          <p style={{ fontSize: '0.875rem', opacity: 0.92, margin: 0, lineHeight: 1.5 }}>
            Verifikasi pengiriman konten promosi secara berkala, pantau kinerja leaderboard, dan unduh laporan aktivitas secara instan.
          </p>
        </div>

        {pendingCount > 0 && (
          <button
            onClick={() => router.push('/admin/verifikasi')}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#fbc513',
              color: '#0d1117',
              fontWeight: 700,
              fontSize: '0.875rem',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 4px 12px rgba(251, 197, 19, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'transform 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <span>Verifikasi ({pendingCount})</span>
            <IconChevronRight size={16} />
          </button>
        )}
      </div>

      {/* 2. Overview Metrics Row (MagangHub Style) */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.25rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(13, 169, 77, 0.15)',
              color: 'var(--green-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconBarChart size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Status Operasional Wilayah
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Monitoring real-time aktivitas influencer karyawan
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Karyawan Terdaftar
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              👥 {employeeCount} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Orang</span>
            </div>
          </div>

          <div style={{ width: '1px', height: '32px', background: 'var(--border-subtle)' }} />

          <div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Antrean Verifikasi
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: pendingCount > 0 ? 'var(--gold-400)' : 'var(--green-light)' }}>
              {pendingCount} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Post</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Two-Column Dashboard Section: Action Needed & Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Perlu Tindakan Card */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              ⚡ Perlu Tindakan
            </h3>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                padding: '0.2rem 0.5rem',
                borderRadius: 'var(--radius-full)',
                background: pendingCount > 0 ? 'rgba(251, 197, 19, 0.15)' : 'rgba(13, 169, 77, 0.15)',
                color: pendingCount > 0 ? 'var(--gold-400)' : 'var(--green-light)',
              }}
            >
              {pendingCount} Tugas
            </span>
          </div>

          {pendingCount > 0 ? (
            <div
              onClick={() => router.push('/admin/verifikasi')}
              style={{
                padding: '1.25rem',
                background: 'rgba(251, 197, 19, 0.06)',
                border: '1px solid rgba(251, 197, 19, 0.25)',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.5rem' }}>📥</span>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {pendingCount} Submission Baru Menunggu Review
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Klik di sini untuk membuka halaman verifikasi &rarr;
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '2rem 1.5rem',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(13, 169, 77, 0.15)',
                  color: 'var(--green-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconCheckCircle size={22} />
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Semua Beres!
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Tidak ada antrean tugas verifikasi yang menunggu saat ini.
              </div>
            </div>
          )}
        </div>

        {/* Recent Submissions Activity Card */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              🕒 Aktivitas Terbaru
            </h3>
            <button
              onClick={() => router.push('/admin/verifikasi')}
              style={{ fontSize: '0.75rem', color: 'var(--green-light)', fontWeight: 600 }}
            >
              Semua &rarr;
            </button>
          </div>

          {recentPosts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {recentPosts.slice(0, 4).map((post: any) => {
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
                      padding: '0.75rem 0.875rem',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)',
                          color: '#ffffff',
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                          {post.user?.nama}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          {post.content_type?.nama} • {formatDate(post.submitted_at)}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: 'var(--text-secondary)',
                        textTransform: 'capitalize',
                      }}
                    >
                      {post.platform}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.8125rem' }}>
              Belum ada aktivitas terbaru dari karyawan.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
