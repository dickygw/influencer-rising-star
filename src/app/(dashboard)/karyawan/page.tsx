'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getKaryawanDashboardSummary } from './actions'
import {
  IconStar,
  IconUpload,
  IconCheckCircle,
  IconHistory,
  IconShare,
  IconTrophy,
  IconChevronRight,
} from '@/components/icons'

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
      <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
        Memuat data dashboard...
      </div>
    )
  }

  const { totalBalance, quotaRemaining, stats } = summary

  return (
    <div className="karyawan-dashboard animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
              IRS Journey 2026
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>Batas Pengumpulan: 30 Sep 2026</span>
          </div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.01em' }}>
            Selamat Datang, {summary.nama}!
          </h2>
          <p style={{ fontSize: '0.875rem', opacity: 0.92, margin: 0, lineHeight: 1.5 }}>
            Bagikan konten promosi resmi Pegadaian di sosial media Anda, kumpulkan poin keaktifan, dan raih posisi teratas di Leaderboard nasional.
          </p>
        </div>

        <button
          onClick={() => router.push('/karyawan/submission')}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#ffffff',
            color: '#064e26',
            fontWeight: 700,
            fontSize: '0.875rem',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'transform 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <span>Submit Konten</span>
          <IconChevronRight size={16} />
        </button>
      </div>

      {/* 2. Active Batch Progress Bar Card (MagangHub Style) */}
      <div
        className="card-batch"
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
            <IconTrophy size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Kuartal 3 • Musim Advokasi 2026
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Periode 1 Juli 2026 – 30 September 2026
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Poin Anda
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gold-400)' }}>
              ⭐ {totalBalance} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Poin</span>
            </div>
          </div>

          <div style={{ width: '1px', height: '32px', background: 'var(--border-subtle)' }} />

          <div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Kuota Submit Hari Ini
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: quotaRemaining > 0 ? 'var(--green-light)' : 'var(--error)' }}>
              {quotaRemaining} / 3 <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Slot</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Two-Column Dashboard Section: Action Needed & Submission Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Submission Status Summary */}
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
              📊 Ringkasan Submission Saya
            </h3>
            <button
              onClick={() => router.push('/karyawan/riwayat')}
              style={{ fontSize: '0.75rem', color: 'var(--green-light)', fontWeight: 600 }}
            >
              Lihat Detail &rarr;
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            <div
              style={{
                background: 'rgba(13, 169, 77, 0.08)',
                border: '1px solid rgba(13, 169, 77, 0.25)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--green-light)' }}>
                {stats.approved}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: '4px' }}>
                Disetujui
              </div>
            </div>

            <div
              style={{
                background: 'rgba(251, 197, 19, 0.08)',
                border: '1px solid rgba(251, 197, 19, 0.25)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gold-400)' }}>
                {stats.pending}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: '4px' }}>
                Pending
              </div>
            </div>

            <div
              style={{
                background: 'rgba(248, 81, 73, 0.08)',
                border: '1px solid rgba(248, 81, 73, 0.25)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--error)' }}>
                {stats.rejected}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: '4px' }}>
                Ditolak
              </div>
            </div>
          </div>
        </div>

        {/* Quick Participation Steps Guide */}
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
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            📌 Langkah Cepat Partisipasi
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(13, 169, 77, 0.15)',
                  color: 'var(--green-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              >
                1
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Tautkan Sosial Media:</strong> Daftarkan akun Instagram, TikTok, Facebook, atau X di menu <em>Akun Sosmed</em>.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(13, 169, 77, 0.15)',
                  color: 'var(--green-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              >
                2
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Posting Promosi:</strong> Upload konten promo resmi Pegadaian di media sosial pribadi Anda.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(13, 169, 77, 0.15)',
                  color: 'var(--green-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              >
                3
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Submit Bukti:</strong> Kirimkan tautan postingan & screenshot di menu <em>Submit Konten</em> untuk dinilai.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
