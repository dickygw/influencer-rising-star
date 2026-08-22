'use client'

import { useState, useEffect } from 'react'
import { createKaryawan, updateKaryawan } from './actions'

type KaryawanModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  karyawan: any | null // Null means "Add Mode", object means "Edit Mode"
  cabangList: Array<{ id: number; kode_cabang: string; nama: string }>
}

export default function KaryawanModal({
  isOpen,
  onClose,
  onSuccess,
  karyawan,
  cabangList,
}: KaryawanModalProps) {
  const isEditMode = !!karyawan

  const [nip, setNip] = useState('')
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [noHp, setNoHp] = useState('')
  const [jabatan, setJabatan] = useState('')
  const [cabangId, setCabangId] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive' | 'suspended'>('active')
  const [password, setPassword] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset or fill form values when modal opens or edit targets change
  useEffect(() => {
    if (isOpen) {
      setError(null)
      if (karyawan) {
        setNip(karyawan.nip)
        setNama(karyawan.nama)
        setEmail(karyawan.email || '')
        setNoHp(karyawan.no_hp || '')
        setJabatan(karyawan.jabatan || '')
        setCabangId(karyawan.cabang?.id?.toString() || '')
        setStatus(karyawan.status)
        setPassword('') // Don't edit password here
      } else {
        setNip('')
        setNama('')
        setEmail('')
        setNoHp('')
        setJabatan('')
        setCabangId(cabangList[0]?.id?.toString() || '')
        setStatus('active')
        setPassword('')
      }
    }
  }, [isOpen, karyawan, cabangList])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!cabangId) {
      setError('Pilih kantor cabang terlebih dahulu')
      setIsLoading(false)
      return
    }

    try {
      if (isEditMode) {
        const result = await updateKaryawan(karyawan.id, {
          nama,
          email,
          no_hp: noHp,
          jabatan,
          cabang_id: cabangId,
          status,
        })

        if (result.success) {
          onSuccess()
          onClose()
        } else {
          setError(result.error || 'Gagal mengubah data karyawan')
        }
      } else {
        if (!password || password.length < 8) {
          setError('Password minimal 8 karakter')
          setIsLoading(false)
          return
        }
        if (!/[A-Z]/.test(password)) {
          setError('Password harus mengandung minimal 1 huruf besar')
          setIsLoading(false)
          return
        }
        if (!/[0-9]/.test(password)) {
          setError('Password harus mengandung minimal 1 angka')
          setIsLoading(false)
          return
        }

        const result = await createKaryawan({
          nip,
          nama,
          email,
          no_hp: noHp,
          jabatan,
          cabang_id: cabangId,
          status,
          password,
        })

        if (result.success) {
          onSuccess()
          onClose()
        } else {
          setError(result.error || 'Gagal menambahkan karyawan baru')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: var(--spacing-md);
          animation: fadeIn 200ms ease-out;
        }

        .modal-card {
          width: 100%;
          max-width: 500px;
          background: var(--gradient-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-xl);
          overflow: hidden;
          position: relative;
          animation: scaleIn 300ms var(--transition-spring);
        }

        .modal-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--gradient-green);
        }

        .modal-header {
          padding: var(--spacing-lg) var(--spacing-xl);
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .modal-close-btn {
          color: var(--text-muted);
          font-size: 1.25rem;
          transition: color var(--transition-fast);
        }

        .modal-close-btn:hover {
          color: var(--text-primary);
        }

        .modal-body {
          padding: var(--spacing-xl);
          max-height: 70vh;
          overflow-y: auto;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-md);
        }

        .full-width {
          grid-column: span 2;
        }

        .modal-footer {
          padding: var(--spacing-lg) var(--spacing-xl);
          border-top: 1px solid var(--border-subtle);
          display: flex;
          justify-content: flex-end;
          gap: var(--spacing-md);
        }

        .btn-cancel {
          padding: 0.625rem 1.25rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-default);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 600;
          transition: all var(--transition-fast);
        }

        .btn-cancel:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }

        .btn-save {
          padding: 0.625rem 1.25rem;
          border-radius: var(--radius-md);
          background: var(--gradient-green);
          color: var(--text-on-gold);
          font-size: 0.875rem;
          font-weight: 700;
          box-shadow: var(--shadow-green);
          transition: all var(--transition-fast);
        }

        .btn-save:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>

      <div className="modal-card">
        <div className="modal-header">
          <h2 className="modal-title">
            {isEditMode ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
          </h2>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="login-error" style={{ marginBottom: 'var(--spacing-md)' }}>
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            <div className="form-grid">
              {/* NIP - disabled in Edit Mode */}
              <div className="form-group">
                <label className="form-label" htmlFor="karyawan-nip">NIP</label>
                <div className="form-input-wrapper">
                  <input
                    id="karyawan-nip"
                    type="text"
                    className="form-input"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    required
                    disabled={isEditMode || isLoading}
                    placeholder="Contoh: 12345"
                    style={{ paddingLeft: '1rem' }}
                  />
                </div>
              </div>

              {/* Status */}
              <div className="form-group">
                <label className="form-label" htmlFor="karyawan-status">Status</label>
                <div className="form-input-wrapper">
                  <select
                    id="karyawan-status"
                    className="form-input"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    disabled={isLoading}
                    style={{ paddingLeft: '1rem', appearance: 'auto' }}
                  >
                    <option value="active" style={{ background: 'var(--bg-secondary)' }}>Aktif</option>
                    <option value="inactive" style={{ background: 'var(--bg-secondary)' }}>Nonaktif</option>
                    <option value="suspended" style={{ background: 'var(--bg-secondary)' }}>Ditangguhkan</option>
                  </select>
                </div>
              </div>

              {/* Nama */}
              <div className="form-group full-width">
                <label className="form-label" htmlFor="karyawan-nama">Nama Lengkap</label>
                <div className="form-input-wrapper">
                  <input
                    id="karyawan-nama"
                    type="text"
                    className="form-input"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    required
                    disabled={isLoading}
                    placeholder="Masukkan nama lengkap"
                    style={{ paddingLeft: '1rem' }}
                  />
                </div>
              </div>

              {/* Jabatan */}
              <div className="form-group">
                <label className="form-label" htmlFor="karyawan-jabatan">Jabatan</label>
                <div className="form-input-wrapper">
                  <input
                    id="karyawan-jabatan"
                    type="text"
                    className="form-input"
                    value={jabatan}
                    onChange={(e) => setJabatan(e.target.value)}
                    disabled={isLoading}
                    placeholder="Contoh: Marketing"
                    style={{ paddingLeft: '1rem' }}
                  />
                </div>
              </div>

              {/* Cabang */}
              <div className="form-group">
                <label className="form-label" htmlFor="karyawan-cabang">Kantor Cabang</label>
                <div className="form-input-wrapper">
                  <select
                    id="karyawan-cabang"
                    className="form-input"
                    value={cabangId}
                    onChange={(e) => setCabangId(e.target.value)}
                    required
                    disabled={isLoading}
                    style={{ paddingLeft: '1rem', appearance: 'auto' }}
                  >
                    <option value="" disabled style={{ background: 'var(--bg-secondary)' }}>Pilih Cabang</option>
                    {cabangList.map((cabang) => (
                      <option key={cabang.id} value={cabang.id} style={{ background: 'var(--bg-secondary)' }}>
                        {cabang.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Email (Optional) */}
              <div className="form-group">
                <label className="form-label" htmlFor="karyawan-email">Email (Opsional)</label>
                <div className="form-input-wrapper">
                  <input
                    id="karyawan-email"
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    placeholder="email@domain.com"
                    style={{ paddingLeft: '1rem' }}
                  />
                </div>
              </div>

              {/* No HP (Optional) */}
              <div className="form-group">
                <label className="form-label" htmlFor="karyawan-nohp">No HP (Opsional)</label>
                <div className="form-input-wrapper">
                  <input
                    id="karyawan-nohp"
                    type="text"
                    className="form-input"
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    disabled={isLoading}
                    placeholder="Contoh: 0812345"
                    style={{ paddingLeft: '1rem' }}
                  />
                </div>
              </div>

              {/* Password - Only for Create mode */}
              {!isEditMode && (
                <div className="form-group full-width">
                  <label className="form-label" htmlFor="karyawan-password">Password Akun</label>
                  <div className="form-input-wrapper">
                    <input
                      id="karyawan-password"
                      type="password"
                      className="form-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required={!isEditMode}
                      disabled={isLoading}
                      placeholder="Min. 8 karakter (ada huruf besar & angka)"
                      style={{ paddingLeft: '1rem' }}
                    />
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    🔒 Password min. 8 karakter, wajib kombinasi 1 huruf besar dan 1 angka.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={isLoading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={isLoading}
            >
              {isLoading ? 'Menyimpan...' : isEditMode ? 'Simpan Perubahan' : 'Tambah Karyawan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
