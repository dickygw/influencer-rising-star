'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import NotificationBell from './notifications/notification-bell'
import { IdleTimeoutDetector } from './idle-timeout-detector'
import {
  IconHome,
  IconUpload,
  IconHistory,
  IconTrophy,
  IconStar,
  IconShare,
  IconCheckCircle,
  IconUsers,
  IconBarChart,
  IconFileText,
  IconMenu,
  IconChevronLeft,
  IconChevronRight,
  IconLogOut,
  IconSearch,
  IconBuilding,
  IconUser,
} from '@/components/icons'

type DashboardShellProps = {
  user: {
    nama: string
    nip: string
    role: string
    kanwilName: string
  }
  children: React.ReactNode
}

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  badge?: number | string
  badgeColor?: string
}

type NavSection = {
  title: string
  links: NavItem[]
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Sidebar expanded / drawer state
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingCount, setPendingCount] = useState<number>(0)

  const isAdmin = user.role === 'admin_kanwil' || user.role === 'admin_pusat'

  // Fetch pending submissions for admin real-time badge
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
  }, [isAdmin])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'PG'
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin_kanwil':
        return 'Admin Kanwil'
      case 'admin_pusat':
        return 'Admin Pusat'
      default:
        return 'Karyawan / Peserta'
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
      await supabase.auth.signOut().catch(() => {})
    } catch (err) {
      console.error('Logout error:', err)
    }
    window.location.href = '/login'
  }

  // Clean, structured navigation sections
  const karyawanSections: NavSection[] = [
    {
      title: 'NAVIGASI',
      links: [
        { href: '/karyawan', label: 'Dashboard', icon: IconHome },
      ],
    },
    {
      title: 'AKTIVITAS ADVOKASI',
      links: [
        { href: '/karyawan/submission', label: 'Submit Konten', icon: IconUpload },
        { href: '/karyawan/riwayat', label: 'Riwayat Submission', icon: IconHistory },
        { href: '/karyawan/sosmed', label: 'Akun Sosmed & Bio Link', icon: IconShare },
      ],
    },
    {
      title: 'KOMPETISI & POIN',
      links: [
        { href: '/karyawan/leaderboard', label: 'Leaderboard', icon: IconTrophy },
        { href: '/karyawan/poin', label: 'Poin Saya', icon: IconStar },
      ],
    },
  ]

  const adminSections: NavSection[] = [
    {
      title: 'NAVIGASI',
      links: [
        { href: '/admin', label: 'Dashboard', icon: IconHome },
      ],
    },
    {
      title: 'MANAJEMEN WILAYAH',
      links: [
        {
          href: '/admin/verifikasi',
          label: 'Verifikasi Submission',
          icon: IconCheckCircle,
          badge: pendingCount > 0 ? pendingCount : undefined,
          badgeColor: 'green',
        },
        { href: '/admin/karyawan', label: 'Kelola Karyawan', icon: IconUsers },
      ],
    },
    {
      title: 'ANALITIK & LAPORAN',
      links: [
        { href: '/admin/analitik', label: 'Data Analitik', icon: IconBarChart },
        { href: '/admin/leaderboard', label: 'Leaderboard', icon: IconTrophy },
        { href: '/admin/laporan', label: 'Laporan & Rekap', icon: IconFileText },
      ],
    },
  ]

  const sections = isAdmin ? adminSections : karyawanSections

  // Flat list for icon rail
  const allLinks = useMemo(() => {
    return sections.flatMap((s) => s.links)
  }, [sections])

  // Get current page title for breadcrumb
  const currentPageTitle = useMemo(() => {
    const active = allLinks.find((l) => l.href === pathname)
    return active ? active.label : 'Dasbor'
  }, [allLinks, pathname])

  return (
    <div className="app-layout">
      {/* Background Inactivity Auto-Logout Detector (5m Admin, 10m Karyawan) */}
      <IdleTimeoutDetector role={user.role} />

      {/* =========================================================
          1. SLIM ICON RAIL (LEFTMOST FIXED COLUMN - 64px)
          ========================================================= */}
      <aside className="icon-rail">
        {/* Brand Logo icon button */}
        <div className="rail-top">
          <button
            className="rail-logo-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title="Influencer Rising Star"
            aria-label="Toggle Navigation Drawer"
          >
            <div className="rail-logo-inner">⭐</div>
          </button>

          {/* Hamburger toggle button */}
          <button
            className={`rail-action-btn ${isExpanded ? 'rail-action-btn--active' : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Tutup Panel Navigasi' : 'Buka Panel Navigasi Lengkap'}
            aria-label="Menu Navigasi"
          >
            <IconMenu size={20} />
          </button>
        </div>

        {/* Icon-only nav list */}
        <nav className="rail-nav">
          {allLinks.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <button
                key={item.href}
                className={`rail-nav-item ${isActive ? 'rail-nav-item--active' : ''}`}
                onClick={() => {
                  router.push(item.href)
                  setIsExpanded(false)
                }}
                title={item.label}
              >
                <Icon size={20} />
                {item.badge !== undefined && (
                  <span className="rail-badge-dot" />
                )}
              </button>
            )
          })}
        </nav>

        {/* Rail Bottom items: User avatar & Logout */}
        <div className="rail-bottom">
          <button
            className="rail-action-btn"
            onClick={handleLogout}
            title="Keluar / Logout"
            aria-label="Keluar"
          >
            <IconLogOut size={18} />
          </button>

          <div
            className="rail-avatar"
            title={`${user.nama} (${getRoleLabel(user.role)})`}
          >
            {getInitials(user.nama)}
          </div>
        </div>
      </aside>

      {/* =========================================================
          2. EXPANDABLE DRAWER PANEL (SLIDE-OUT 260px)
          ========================================================= */}
      {isExpanded && (
        <div className="drawer-backdrop" onClick={() => setIsExpanded(false)} />
      )}

      <aside className={`nav-drawer ${isExpanded ? 'nav-drawer--open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-brand-group">
            <h2 className="drawer-app-title">Influencer Rising Star</h2>
            <p className="drawer-app-sub">PT Pegadaian (Persero)</p>
          </div>
          <button
            className="drawer-close-btn"
            onClick={() => setIsExpanded(false)}
            aria-label="Tutup Navigasi"
          >
            <IconChevronLeft size={18} />
          </button>
        </div>

        {/* Active Quarter banner */}
        <div className="drawer-quarter-badge">
          <div className="quarter-tag">⏱️ Kuartal Q3 2026</div>
          <div className="quarter-date">Periode 1 Jul – 30 Sep 2026</div>
        </div>

        {/* Drawer navigation sections */}
        <nav className="drawer-nav">
          {sections.map((section) => (
            <div key={section.title} className="drawer-section">
              <div className="drawer-section-title">{section.title}</div>
              <div className="drawer-section-list">
                {section.links.map((link) => {
                  const Icon = link.icon
                  const isActive = pathname === link.href
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      className={`drawer-link ${isActive ? 'drawer-link--active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault()
                        setIsExpanded(false)
                        router.push(link.href)
                      }}
                    >
                      <div className="drawer-link-left">
                        <Icon size={18} className="drawer-link-icon" />
                        <span className="drawer-link-text">{link.label}</span>
                      </div>
                      {link.badge !== undefined && (
                        <span className="drawer-count-badge">
                          {link.badge}
                        </span>
                      )}
                    </a>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Drawer footer tenant card */}
        <div className="drawer-footer">
          <div className="drawer-user-card">
            <div className="drawer-user-avatar">
              {getInitials(user.nama)}
            </div>
            <div className="drawer-user-info">
              <div className="drawer-user-name" title={user.nama}>{user.nama}</div>
              <div className="drawer-user-role">{getRoleLabel(user.role)}</div>
            </div>
          </div>
          <button className="drawer-logout-btn" onClick={handleLogout}>
            <IconLogOut size={16} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* =========================================================
          3. MAIN CONTENT CONTAINER & TOPBAR
          ========================================================= */}
      <div className="main-wrapper">
        {/* Modern Enterprise Topbar */}
        <header className="enterprise-topbar">
          {/* Left: Nav Back/Forward + Breadcrumbs */}
          <div className="topbar-left">
            <div className="nav-arrow-group">
              <button
                className="nav-arrow-btn"
                onClick={() => window.history.back()}
                title="Halaman Sebelumnya"
                aria-label="Kembali"
              >
                <IconChevronLeft size={16} />
              </button>
              <button
                className="nav-arrow-btn"
                onClick={() => window.history.forward()}
                title="Halaman Berikutnya"
                aria-label="Maju"
              >
                <IconChevronRight size={16} />
              </button>
            </div>

            {/* Breadcrumb trail */}
            <div className="enterprise-breadcrumbs">
              <span className="crumb-root">Beranda</span>
              <span className="crumb-separator">&gt;</span>
              <span className="crumb-current">{currentPageTitle}</span>
            </div>
          </div>

          {/* Center: Search input */}
          <div className="topbar-center">
            <div className="search-bar-wrapper">
              <IconSearch size={16} className="search-bar-icon" />
              <input
                type="text"
                className="search-bar-input"
                placeholder="Cari fitur, menu, atau informasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Right: Tenant info, Notifications, User */}
          <div className="topbar-right">
            {/* Pegadaian Kanwil Tenant chip */}
            <div className="tenant-chip" title={user.kanwilName || 'PT Pegadaian'}>
              <div className="tenant-logo-dot" />
              <span className="tenant-name">
                {user.kanwilName ? `PT Pegadaian ${user.kanwilName}` : 'PT Pegadaian (Persero)'}
              </span>
            </div>

            {/* Notification Bell */}
            <NotificationBell />

            {/* User Avatar Chip */}
            <div className="user-profile-chip" title={`${user.nama} • ${user.nip}`}>
              <div className="user-avatar-circle">
                {getInitials(user.nama)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="content-viewport">
          <div className="content-container">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
