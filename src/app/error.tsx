'use client'

import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Captured by Next.js Error Boundary:', error)
  }, [error])

  // Ignore Next.js internal redirects
  if (error?.digest?.startsWith('NEXT_REDIRECT') || error?.message?.includes('NEXT_REDIRECT')) {
    return null
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0d1117',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '2rem',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
          Terjadi Kendala Memuat Halaman
        </h2>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'rgba(255, 255, 255, 0.7)',
            lineHeight: 1.5,
            marginBottom: '1.5rem',
          }}
        >
          {error?.message && !error.message.includes('Minified')
            ? error.message
            : 'Sesi Anda atau koneksi ke server sedang mengalami gangguan. Silakan muat ulang atau masuk kembali.'}
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: '#0da94d',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Muat Ulang
          </button>
          <button
            onClick={() => {
              window.location.href = '/login'
            }}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'transparent',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Halaman Login
          </button>
        </div>
      </div>
    </div>
  )
}
