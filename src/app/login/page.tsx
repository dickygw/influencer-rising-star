'use client'

import { useActionState, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { login, type LoginState } from './actions'

function SessionExpiredNotice() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')
  const durasi = searchParams.get('durasi') || '5'

  if (reason === 'session_expired') {
    return (
      <div className="login-error" style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', borderColor: '#eab308', color: '#fef08a' }}>
        <span className="login-error-icon">ℹ</span>
        <span>Sesi Anda telah berakhir karena akun Anda login di perangkat / laptop lain.</span>
      </div>
    )
  }

  if (reason === 'idle_timeout') {
    return (
      <div className="login-error" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: '#3b82f6', color: '#93c5fd' }}>
        <span className="login-error-icon">⏱</span>
        <span>Sesi otomatis keluar karena tidak ada aktivitas selama {durasi} menit demi keamanan akun Anda. Silakan login kembali.</span>
      </div>
    )
  }

  return null
}

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    login,
    { error: undefined, success: undefined }
  )
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Brand header */}
        <div className="login-brand">
          <div className="login-logo">
            <span>⭐</span>
          </div>
          <h1 className="login-title">Influencer Rising Star</h1>
          <p className="login-subtitle">Employee Advocacy — Sosial Media</p>
        </div>

        {/* Session Expired / Device Conflict notice */}
        <Suspense fallback={null}>
          <SessionExpiredNotice />
        </Suspense>

        {/* Error message */}
        {state.error && (
          <div className="login-error">
            <span className="login-error-icon">⚠</span>
            <span>{state.error}</span>
          </div>
        )}

        {/* Login form */}
        <form action={formAction} className="login-form">
          <div className="form-group">
            <label htmlFor="nip" className="form-label">
              NIP
            </label>
            <div className="form-input-wrapper">
              <input
                id="nip"
                name="nip"
                type="text"
                placeholder="Masukkan NIP Anda"
                className="form-input"
                autoComplete="username"
                required
                disabled={isPending}
                autoFocus
              />
              <span className="form-input-icon">👤</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="form-input-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan password"
                className="form-input"
                autoComplete="current-password"
                required
                disabled={isPending}
              />
              <span className="form-input-icon">🔒</span>
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-login"
            disabled={isPending}
            id="login-submit"
          >
            <span className="btn-login-text">
              {isPending ? (
                <>
                  <span className="spinner" />
                  <span>Memproses...</span>
                </>
              ) : (
                'Masuk'
              )}
            </span>
          </button>
        </form>

        <div className="login-footer">
          <p>Influencer Rising Star — PT Pegadaian</p>
          <p style={{ marginTop: '4px', opacity: 0.6 }}>
            Hubungi Admin Kanwil jika belum memiliki akun
          </p>
        </div>
      </div>
    </div>
  )
}
