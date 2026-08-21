'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import NotificationBell from './notifications/notification-bell'

type DashboardShellProps = {
  user: {
    nama: string
    nip: string
    role: string
    kanwilName: string
  }
  children: React.ReactNode
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [pendingCount, setPendingCount] = useState<number>(0)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isAdmin = user.role === 'admin_kanwil' || user.role === 'admin_pusat'

  // Fetch pending submissions for admin's real-time sidebar badge
  useEffect(() => {
    if (!isAdmin) return

    async function fetchPendingCount() {
      try {
        const { count, error } = await supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
        
        if (!error && count !== null) {
          setPendingCount(count)
        }
      } catch (err) {
        console.error('Error fetching pending count for badge:', err)
      }
    }

    fetchPendingCount()
    
    const channel = supabase
      .channel('pending-posts-badge-sidebar')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          fetchPendingCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAdmin, supabase])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin_kanwil':
        return { label: 'Admin Kanwil', className: 'role-badge role-badge--admin' }
      case 'admin_pusat':
        return { label: 'Admin Pusat', className: 'role-badge role-badge--admin' }
      default:
        return { label: 'Karyawan', className: 'role-badge role-badge--karyawan' }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const roleBadge = getRoleBadge(user.role)

  // Configure grouped sidebar links with custom badges
  const karyawanSections = [
    {
      title: 'Navigasi',
      links: [
        { href: '/karyawan', label: 'Dashboard', icon: '🏠', badge: '100%', badgeColor: 'green' }
      ]
    },
    {
      title: 'Aktivitas Advokasi',
      links: [
        { href: '/karyawan/submission', label: 'Submit Konten', icon: '📤', badge: '3/Hari', badgeColor: 'orange' },
        { href: '/karyawan/riwayat', label: 'Riwayat Submission', icon: '📋', badge: 'Detail', badgeColor: 'gray' },
        { href: '/karyawan/poin', label: 'Poin Saya', icon: '⭐', badge: 'Poin', badgeColor: 'gold' },
        { href: '/karyawan/leaderboard', label: 'Leaderboard', icon: '🏆', badge: 'Rank', badgeColor: 'gray' },
        { href: '/karyawan/sosmed', label: 'Akun Sosmed', icon: '📱', badge: 'Sosmed', badgeColor: 'gray' }
      ]
    }
  ]

  const adminSections = [
    {
      title: 'Navigasi',
      links: [
        { href: '/admin', label: 'Dashboard', icon: '🏠', badge: '100%', badgeColor: 'green' }
      ]
    },
    {
      title: 'Manajemen Wilayah',
      links: [
        { 
          href: '/admin/verifikasi', 
          label: 'Verifikasi Submission', 
          icon: '✅'
        },
        { href: '/admin/karyawan', label: 'Kelola Karyawan', icon: '👥', badge: 'Kelola', badgeColor: 'gray' },
        { href: '/admin/analitik', label: 'Data Analitik', icon: '📈', badge: 'Live', badgeColor: 'gold' },
        { href: '/admin/leaderboard', label: 'Leaderboard', icon: '🏆', badge: '🏆', badgeColor: 'gray' },
        { href: '/admin/laporan', label: 'Laporan & Rekap', icon: '📊', badge: 'Excel', badgeColor: 'green' }
      ]
    }
  ]

  const sections = isAdmin ? adminSections : karyawanSections

  return (
    <div className="dashboard-layout">
      {/* Top Bar Header Bar */}
      <header className="topbar">
        <div className="topbar-brand" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <button 
            className="sidebar-toggle" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle Sidebar"
            style={{ marginRight: 'var(--spacing-xs)' }}
          >
            ☰
          </button>
          <div className="topbar-logo-img">⭐</div>
          <div className="topbar-text-group">
            <div className="topbar-title">Influencer Rising Star</div>
            <div className="topbar-subtitle">
              {isAdmin ? 'Dashboard Admin' : 'Dashboard Peserta'}
            </div>
          </div>
        </div>

        <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          {/* Notification bell */}
          <NotificationBell />
          
          <div className="topbar-divider" style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />

          {/* Quick info */}
          <span className="topbar-kanwil-info" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {user.kanwilName || 'Pegadaian'}
          </span>
        </div>
      </header>

      {/* Sidebar Overlay (Mobile only) */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar Layout */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        {/* Active Quarter countdown block (replaces Batas Assessment) */}
        <div className="sidebar-card">
          <div className="sidebar-card-label">Kuartal Aktif</div>
          <div className="sidebar-card-val">⏱️ Q3 2026</div>
          <div className="sidebar-card-sub">Berakhir 30 Sep 2026</div>
        </div>

        <nav className="sidebar-nav" style={{ overflowY: 'auto' }}>
          {sections.map((section) => (
            <div key={section.title} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="sidebar-category-header">{section.title}</div>
              {section.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`sidebar-link ${
                    pathname === link.href ? 'sidebar-link--active' : ''
                  }`}
                  onClick={(e) => {
                    e.preventDefault()
                    setSidebarOpen(false) // Close sidebar on mobile after clicking
                    router.push(link.href)
                  }}
                >
                  <div className="sidebar-link-content">
                    <span className="sidebar-link-icon">{link.icon}</span>
                    <span>{link.label}</span>
                  </div>
                  {link.badge && (
                    <span className={`nav-badge nav-badge--${link.badgeColor}`}>
                      {link.badge}
                    </span>
                  )}
                </a>
              ))}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer User Info */}
        <div className="sidebar-footer" style={{ marginTop: 'auto' }}>
          <div className="sidebar-user">
            <div className="sidebar-avatar">{getInitials(user.nama)}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name" title={user.nama}>{user.nama}</div>
              <div className="sidebar-user-role">
                <span className={roleBadge.className}>{roleBadge.label}</span>
              </div>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <span>🚪</span>
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main content page area */}
      <main className="dashboard-main">
        <div style={{ width: '100%' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
