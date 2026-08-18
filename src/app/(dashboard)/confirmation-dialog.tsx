'use client'

// =========================================================================
// KOMPONEN UI: ConfirmationDialog
// Kegunaan: Dialog modal konfirmasi kustom premium dengan efek glassmorphism,
//           efek spring bounce-in, dan halo glow berdenyut.
//           Digunakan untuk menggantikan alert browser bawaan di seluruh aplikasi.
// =========================================================================

import { useEffect, useState } from 'react'

type ConfirmationDialogProps = {
  isOpen: boolean                   // Status apakah dialog terbuka atau tertutup
  onClose: () => void               // Aksi ketika pengguna menekan tombol Batal/Tutup
  onConfirm: () => void             // Aksi ketika pengguna menekan tombol Konfirmasi/Setuju
  title: string                     // Judul dialog yang ditampilkan di bagian atas
  message: string                   // Pesan deskripsi penjelasan aksi konfirmasi
  confirmText?: string              // Label tombol konfirmasi (default: 'Ya, Lanjutkan')
  cancelText?: string               // Label tombol batal (default: 'Batal')
  type?: 'success' | 'warning' | 'danger' | 'info' // Tipe skema warna aksen dialog
  isLoading?: boolean               // Menampilkan spinner loading ketika proses backend berjalan
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  type = 'warning',
  isLoading = false,
}: ConfirmationDialogProps) {
  // State untuk mengontrol delay animasi keluar masuk (mount/unmount) modal
  const [mounted, setMounted] = useState(false)

  // Mengatur scrollbar layar utama mati saat modal aktif (terbuka)
  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      document.body.style.overflow = 'hidden'
    } else {
      const timer = setTimeout(() => setMounted(false), 300) // Delay 300ms agar animasi keluar selesai terputar
      document.body.style.overflow = 'unset'
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen && !mounted) return null


  // Icon based on type
  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="icon-svg success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'danger':
        return (
          <svg className="icon-svg danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      case 'info':
        return (
          <svg className="icon-svg info" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'warning':
      default:
        return (
          <svg className="icon-svg warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
    }
  }

  return (
    <div className={`dialog-backdrop ${isOpen ? 'active' : ''}`}>
      <style jsx>{`
        .dialog-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: var(--spacing-md);
          opacity: 0;
          transition: opacity 300ms ease;
          pointer-events: none;
        }

        .dialog-backdrop.active {
          opacity: 1;
          pointer-events: auto;
        }

        .dialog-card {
          width: 100%;
          max-width: 420px;
          background: #ffffff;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-xl);
          box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.05);
          overflow: hidden;
          padding: var(--spacing-xl);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transform: scale(0.92) translateY(10px);
          transition: transform 300ms var(--transition-spring);
        }

        .dialog-backdrop.active .dialog-card {
          transform: scale(1) translateY(0);
        }

        /* Decorative top accent colored ring */
        .icon-container {
          width: 64px;
          height: 64px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: var(--spacing-lg);
          position: relative;
        }

        .icon-container::after {
          content: '';
          position: absolute;
          inset: -6px;
          border-radius: inherit;
          opacity: 0.15;
          animation: pulseGlow 2s infinite ease-in-out;
        }

        .icon-container.success {
          background: #d1fae5;
          color: #059669;
        }
        .icon-container.success::after {
          background: #10b981;
        }

        .icon-container.danger {
          background: #fee2e2;
          color: #dc2626;
        }
        .icon-container.danger::after {
          background: #ef4444;
        }

        .icon-container.warning {
          background: #fef3c7;
          color: #d97706;
        }
        .icon-container.warning::after {
          background: #f59e0b;
        }

        .icon-container.info {
          background: #dbeafe;
          color: #2563eb;
        }
        .icon-container.info::after {
          background: #3b82f6;
        }

        .icon-svg {
          width: 28px;
          height: 28px;
        }

        .dialog-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: var(--spacing-sm);
        }

        .dialog-message {
          font-size: 0.9375rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: var(--spacing-xl);
        }

        .dialog-actions {
          display: flex;
          width: 100%;
          gap: var(--spacing-md);
        }

        .btn-action {
          flex: 1;
          padding: 0.75rem var(--spacing-md);
          border-radius: var(--radius-lg);
          font-size: 0.875rem;
          font-weight: 700;
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-xs);
        }

        .btn-cancel {
          border: 1px solid var(--border-default);
          background: #f8fafc;
          color: var(--text-secondary);
        }

        .btn-cancel:hover {
          background: #f1f5f9;
          color: var(--text-primary);
          border-color: #cbd5e1;
        }

        .btn-confirm {
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
        }

        .btn-confirm.success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }
        .btn-confirm.success:hover {
          background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
          transform: translateY(-1px);
        }

        .btn-confirm.danger {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }
        .btn-confirm.danger:hover {
          background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
          transform: translateY(-1px);
        }

        .btn-confirm.warning {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
        }
        .btn-confirm.warning:hover {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          transform: translateY(-1px);
        }

        .btn-confirm.info {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }
        .btn-confirm.info:hover {
          background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
          transform: translateY(-1px);
        }

        .btn-confirm:disabled, .btn-cancel:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: var(--radius-full);
          animation: spin 800ms linear infinite;
        }

        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.15); opacity: 0.3; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="dialog-card">
        <div className={`icon-container ${type}`}>{getIcon()}</div>
        <h2 className="dialog-title">{title}</h2>
        <p className="dialog-message">{message}</p>

        <div className="dialog-actions">
          <button
            className="btn-action btn-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            className={`btn-action btn-confirm ${type}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && <div className="spinner" />}
            {!isLoading && confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
