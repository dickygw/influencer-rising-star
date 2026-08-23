'use client'

import { useEffect, useState } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    console.error('Captured by Next.js Error Boundary:', error)
  }, [error])

  // Allow Next.js internal redirects to pass through
  const digest = error?.digest || ''
  if (digest.includes('NEXT_REDIRECT') || error?.message?.includes('NEXT_REDIRECT')) {
    return null
  }

  // For React error #441 (Server Component error), show a clean recovery UI
  const isServerError = error?.message?.includes('#441') || digest

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
          maxWidth: '520px',
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
            marginBottom: '1rem',
          }}
        >
          {error?.message || 'Sesi Anda atau koneksi ke server sedang mengalami gangguan.'}
        </p>

        {digest && (
          <div
            style={{
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.4)',
              marginBottom: '1rem',
              fontFamily: 'monospace',
            }}
          >
            Digest ID: {digest}
          </div>
        )}

        {showDetails && (
          <pre
            style={{
              textAlign: 'left',
              background: 'rgba(0, 0, 0, 0.5)',
              padding: '0.75rem',
              borderRadius: '8px',
              fontSize: '0.6875rem',
              color: '#f87171',
              maxHeight: '160px',
              overflowY: 'auto',
              marginBottom: '1rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {error?.stack || error?.message || 'No stack trace available'}
          </pre>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
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
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              padding: '0.625rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 255, 255, 0.6)',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '0.75rem',
            }}
          >
            {showDetails ? 'Sembunyikan Detail' : 'Detail Error'}
          </button>
        </div>
      </div>
    </div>
  )
}
