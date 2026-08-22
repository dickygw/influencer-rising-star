'use client'

import { useState, useEffect, useRef } from 'react'
import { getUserNotifications, markAllAsRead } from './actions'
import { createClient } from '@/lib/supabase/client'
import { IconBell } from '@/components/icons'

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const fetchNotifications = async () => {
    const res = await getUserNotifications()
    if (res.success && res.data) {
      setNotifications(res.data)
    }
  }

  useEffect(() => {
    fetchNotifications()

    // Realtime subscription to notifications table for current user
    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => {
          fetchNotifications()
        }
      )
      .subscribe()

    // Handle clicks outside dropdown to close it
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [supabase])

  const handleMarkAsRead = async () => {
    const res = await markAllAsRead()
    if (res.success) {
      // Instantly mark all as read locally
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const getIcon = (type: string) => {
    if (type === 'post_approved') return '🎉'
    if (type === 'post_submitted') return '📥'
    return '⚠️'
  }

  return (
    <div className="bell-container" ref={dropdownRef}>
      <style jsx>{`
        .bell-container {
          position: relative;
          z-index: 90;
        }

        .bell-button {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-default);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
          position: relative;
        }

        .bell-button:hover {
          color: var(--text-primary);
          border-color: var(--green-light);
          background: rgba(117, 192, 68, 0.1);
        }

        .badge {
          position: absolute;
          top: -3px;
          right: -3px;
          background: #f85149;
          color: #fff;
          font-size: 0.625rem;
          font-weight: 700;
          min-width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 3px;
          border: 2px solid var(--bg-rail);
          animation: scaleIn 200ms ease-out;
        }

        .dropdown {
          position: absolute;
          right: 0;
          top: calc(100% + var(--spacing-sm));
          width: 320px;
          background: var(--bg-drawer);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          overflow: hidden;
          animation: fadeInDown 200ms ease-out;
        }

        .dropdown-header {
          padding: var(--spacing-md) var(--spacing-lg);
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dropdown-title {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .btn-clear {
          font-size: 0.75rem;
          color: var(--green-light);
          font-weight: 600;
        }

        .btn-clear:hover {
          text-decoration: underline;
        }

        .dropdown-body {
          max-height: 280px;
          overflow-y: auto;
        }

        .notification-item {
          padding: var(--spacing-md) var(--spacing-lg);
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          gap: var(--spacing-md);
          align-items: flex-start;
          transition: background var(--transition-fast);
        }

        .notification-item:hover {
          background: rgba(255, 255, 255, 0.04);
        }

        .notification-item--unread {
          background: rgba(13, 169, 77, 0.06);
        }

        .notification-icon {
          font-size: 1.125rem;
          flex-shrink: 0;
        }

        .notification-content {
          font-size: 0.8125rem;
          color: var(--text-primary);
          line-height: 1.4;
        }

        .notification-time {
          font-size: 0.6875rem;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .empty-state {
          padding: var(--spacing-xl);
          text-align: center;
          color: var(--text-muted);
          font-size: 0.8125rem;
        }
      `}</style>

      <button
        className="bell-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifikasi"
      >
        <IconBell size={18} />
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="dropdown">
          <div className="dropdown-header">
            <h3 className="dropdown-title">Notifikasi Terbaru</h3>
            {unreadCount > 0 && (
              <button className="btn-clear" onClick={handleMarkAsRead}>
                Tandai dibaca
              </button>
            )}
          </div>

          <div className="dropdown-body">
            {notifications.length > 0 ? (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`notification-item ${
                    !item.is_read ? 'notification-item--unread' : ''
                  }`}
                >
                  <span className="notification-icon">{getIcon(item.type)}</span>
                  <div className="notification-content">
                    <p>{item.message}</p>
                    <div className="notification-time">
                      {new Date(item.created_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">Belum ada notifikasi baru</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
