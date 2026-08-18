'use client'

import { useActionState, useState } from 'react'
import { login, type LoginState } from './actions'

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
