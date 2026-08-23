'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logoutUser } from '@/lib/auth-actions'

interface IdleTimeoutDetectorProps {
  role: string
}

export function IdleTimeoutDetector({ role }: IdleTimeoutDetectorProps) {
  const router = useRouter()
  const supabase = createClient()
  const isLoggingOut = useRef(false)
  const lastActivityRef = useRef<number>(Date.now())

  // Durasi Inactivity Timeout:
  // Admin: 5 menit (300.000 ms)
  // Karyawan: 10 menit (600.000 ms)
  const isAdmin = role === 'admin_kanwil' || role === 'admin_pusat'
  const TIMEOUT_MS = isAdmin ? 5 * 60 * 1000 : 10 * 60 * 1000

  const handleIdleLogout = useCallback(async () => {
    if (isLoggingOut.current) return
    isLoggingOut.current = true

    console.warn(`[SECURITY] Sesi ${isAdmin ? 'Admin' : 'Karyawan'} berakhir karena tidak ada aktivitas selama ${isAdmin ? '5' : '10'} menit.`)

    try {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
      await supabase.auth.signOut().catch(() => {})
    } catch (err) {
      console.error('Error during idle auto-logout:', err)
    }

    window.location.href = `/login?reason=idle_timeout&durasi=${isAdmin ? '5' : '10'}`
  }, [isAdmin])

  useEffect(() => {
    lastActivityRef.current = Date.now()

    // Update timestamp saat ada aktivitas user (throttled 1 detik)
    let lastRecorded = 0
    const updateActivity = () => {
      const now = Date.now()
      if (now - lastRecorded > 1000) {
        lastRecorded = now
        lastActivityRef.current = now
      }
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true })
    })

    // Interval checker setiap 5 detik
    const intervalId = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current
      if (idleTime >= TIMEOUT_MS) {
        clearInterval(intervalId)
        handleIdleLogout()
      }
    }, 5000)

    // Deteksi saat tab kembali dibuka / aktif (visibility change)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const idleTime = Date.now() - lastActivityRef.current
        if (idleTime >= TIMEOUT_MS) {
          clearInterval(intervalId)
          handleIdleLogout()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(intervalId)
    }
  }, [TIMEOUT_MS, handleIdleLogout])

  return null
}
