'use client'

import { useState, useTransition } from 'react'
import KaryawanModal from './karyawan-modal'
import { getKaryawanList, bulkUploadKaryawan } from './actions'
import ConfirmationDialog from '../../confirmation-dialog'

type KaryawanClientProps = {
  initialKaryawan: any[]
  cabangList: any[]
}

export default function KaryawanClient({
  initialKaryawan,
  cabangList,
}: KaryawanClientProps) {
  const [karyawanList, setKaryawanList] = useState(initialKaryawan)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCabang, setSelectedCabang] = useState('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [editingKaryawan, setEditingKaryawan] = useState<any | null>(null)
  
  // CSV Upload States
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [isUploading, startUploadTransition] = useTransition()
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; warnings?: string[] | null } | null>(null)

  const [confirmData, setConfirmData] = useState<{
    isOpen: boolean
    type: 'success' | 'warning' | 'danger' | 'info'
    title: string
    message: string
    confirmText?: string
    onConfirm: () => void
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: () => {},
  })

  // Reload employee list on database updates
  const handleRefresh = async () => {
    const result = await getKaryawanList()
    if (result.success && result.data) {
      setKaryawanList(result.data)
    }
  }

  // Filter employees locally for speed
  const filteredKaryawan = karyawanList.filter((item) => {
    const matchSearch =
      item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.jabatan && item.jabatan.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchCabang = selectedCabang ? item.cabang?.id?.toString() === selectedCabang : true

    return matchSearch && matchCabang
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="shadcn-badge shadcn-badge-success">● Aktif</span>
      case 'inactive':
        return <span className="shadcn-badge shadcn-badge-secondary">● Nonaktif</span>
      case 'suspended':
        return <span className="shadcn-badge shadcn-badge-danger">● Ditangguhkan</span>
      default:
        return <span className="shadcn-badge shadcn-badge-secondary">{status}</span>
    }
  }

  return (
    <div>
      <style jsx>{`
        .karyawan-header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-xl);
          flex-wrap: wrap;
          gap: var(--spacing-md);
        }

        .btn-add-karyawan {
          padding: 0.625rem 1.25rem;
          background: linear-gradient(135deg, var(--green-primary) 0%, #0d6b36 100%);
          color: #ffffff;
          font-weight: 600;
          font-size: 0.875rem;
          border-radius: var(--radius-md);
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid var(--border-gold);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-add-karyawan:hover {
          opacity: 0.95;
          transform: translateY(-1px);
        }

        .filter-container {
          background: var(--bg-secondary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-xl);
          padding: 0.875rem 1.25rem;
          margin-bottom: 1.5rem;
          display: flex;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-input-wrapper {
          position: relative;
          flex: 1;
          min-width: 240px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        .filter-search-input {
          width: 100%;
          background: var(--bg-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 0.5rem 1rem 0.5rem 2.25rem;
          color: var(--text-primary);
          font-size: 0.875rem;
        }

        .filter-search-input:focus {
          outline: none;
          border-color: var(--green-primary);
        }

        .filter-select {
          background: var(--bg-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 0.5rem 1rem;
          color: var(--text-primary);
          font-size: 0.875rem;
          min-width: 180px;
          cursor: pointer;
        }

        .filter-select:focus {
          outline: none;
          border-color: var(--green-primary);
        }
      `}</style>

      <div className="karyawan-header-section animate-fade-in">
        <div>
          <h1 className="dashboard-greeting" style={{ margin: 0 }}>Kelola Karyawan</h1>
          <p className="dashboard-date" style={{ marginTop: '4px' }}>
            Daftar karyawan yang terdaftar di bawah Kantor Wilayah Anda.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          <button
            className="btn-add-karyawan"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', boxShadow: 'none', whiteSpace: 'nowrap' }}
            onClick={() => {
              setUploadResult(null)
              setCsvFile(null)
              setIsBulkModalOpen(true)
            }}
          >
            <span>📤</span>
            <span>Bulk Upload (CSV)</span>
          </button>
          <button
            className="btn-add-karyawan"
            style={{ whiteSpace: 'nowrap' }}
            onClick={() => {
              setEditingKaryawan(null)
              setIsModalOpen(true)
            }}
          >
            <span>➕</span>
            <span>Tambah Karyawan</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-container animate-fade-in">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="filter-search-input"
            placeholder="Cari berdasarkan Nama, NIP, Jabatan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={selectedCabang}
          onChange={(e) => setSelectedCabang(e.target.value)}
        >
          <option value="" style={{ background: 'var(--bg-secondary)' }}>Semua Cabang</option>
          {cabangList.map((cabang) => (
            <option key={cabang.id} value={cabang.id} style={{ background: 'var(--bg-secondary)' }}>
              {cabang.nama}
            </option>
          ))}
        </select>
      </div>

      {/* Employees Table - Shadcn UI */}
      <div className="shadcn-card animate-fade-in" style={{ animationDelay: '150ms' }}>
        <div className="shadcn-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: '260px' }}>NIP & Nama Karyawan</th>
                <th style={{ minWidth: '160px' }}>Kantor Cabang</th>
                <th style={{ minWidth: '140px' }}>Jabatan</th>
                <th style={{ minWidth: '180px' }}>Akun Sosmed</th>
                <th style={{ minWidth: '110px', textAlign: 'center' }}>Status</th>
                <th style={{ minWidth: '90px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredKaryawan.length > 0 ? (
                filteredKaryawan.map((karyawan) => {
                  const initials = karyawan.nama
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w: string) => w[0])
                    .join('')
                    .toUpperCase()

                  return (
                    <tr key={karyawan.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="shadcn-avatar">
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{karyawan.nama}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NIP: {karyawan.nip}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {karyawan.cabang?.nama || '-'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {karyawan.jabatan || '-'}
                        </span>
                      </td>
                      <td>
                        {karyawan.social_accounts && karyawan.social_accounts.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {karyawan.social_accounts.map((acc: any) => (
                              <span 
                                key={`${acc.platform}-${acc.handle}`} 
                                className="shadcn-badge shadcn-badge-secondary"
                                style={{ fontSize: '0.75rem' }}
                              >
                                {acc.platform === 'instagram' ? '📸' : 
                                 acc.platform === 'tiktok' ? '📱' : 
                                 acc.platform === 'facebook' ? '👥' : '🐦'}
                                <span>@{acc.handle.replace(/^@/, '')}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum tertaut</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>{getStatusBadge(karyawan.status)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="shadcn-btn-outline"
                          onClick={() => {
                            setEditingKaryawan(karyawan)
                            setIsModalOpen(true)
                          }}
                        >
                          ✏️ Edit
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    🔍 Tidak ada karyawan ditemukan yang cocok dengan kriteria filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      <KaryawanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleRefresh}
        karyawan={editingKaryawan}
        cabangList={cabangList}
      />

      {/* Bulk Upload CSV Modal */}
      {isBulkModalOpen && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 'var(--spacing-md)'
        }}>
          <div className="modal-card" style={{
            width: '100%',
            maxWidth: '500px',
            background: 'var(--gradient-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-xl)',
            padding: 'var(--spacing-xl)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-md)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--spacing-md)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>📤 Bulk Upload Karyawan (CSV)</h2>
              <button style={{ color: 'var(--text-muted)', fontSize: '1.25rem' }} onClick={() => setIsBulkModalOpen(false)}>✕</button>
            </div>

            {/* Template Downloader */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.8125rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>Cara Upload:</div>
              <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary)' }}>
                <li>Unduh template file CSV di bawah ini.</li>
                <li>Isi kolom data karyawan (NIP, Nama, dll.).</li>
                <li>Simpan sebagai format file CSV (.csv) lalu unggah.</li>
              </ol>
              <button
                type="button"
                onClick={() => {
                  const headers = ['nip', 'nama', 'email', 'no_hp', 'jabatan', 'kode_cabang']
                  const sampleRow = ['12345', 'Dian Prasetya', 'dian@email.com', '08123456789', 'Staf', 'BPP-01']
                  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), sampleRow.join(',')].join('\n')
                  const encodedUri = encodeURI(csvContent)
                  const link = document.createElement('a')
                  link.setAttribute('href', encodedUri)
                  link.setAttribute('download', 'Template_Bulk_Upload_Karyawan.csv')
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
                style={{ marginTop: 'var(--spacing-sm)', color: 'var(--green-light)', fontWeight: 700, textDecoration: 'underline', fontSize: '0.8125rem' }}
              >
                📥 Unduh Template CSV Karyawan
              </button>
            </div>

            {/* File Input Form */}
            <form onSubmit={(e) => {
              e.preventDefault()
              if (!csvFile) return

              setUploadResult(null)
              const reader = new FileReader()
              reader.onload = () => {
                const text = reader.result as string
                startUploadTransition(async () => {
                  const res = await bulkUploadKaryawan(text)
                  if (res.success) {
                    setUploadResult({
                      success: true,
                      message: `Berhasil mengunggah ${res.insertedCount} karyawan!`,
                      warnings: res.warnings
                    })
                    handleRefresh()
                  } else {
                    setUploadResult({
                      success: false,
                      message: res.error || 'Gagal mengunggah data'
                    })
                  }
                })
              }
              reader.readAsText(csvFile)
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-lg)' }}>
                <label className="form-label" htmlFor="bulk-file">Pilih File CSV (.csv)</label>
                <input
                  id="bulk-file"
                  type="file"
                  accept=".csv"
                  className="form-input"
                  onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)}
                  required
                  disabled={isUploading}
                  style={{ paddingTop: '8px' }}
                />
              </div>

              {/* Status Display Alerts */}
              {uploadResult && (
                <div style={{
                  padding: 'var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  background: uploadResult.success ? 'rgba(13, 169, 77, 0.1)' : 'var(--error-bg)',
                  color: uploadResult.success ? 'var(--green-light)' : 'var(--error)',
                  border: `1px solid ${uploadResult.success ? 'var(--border-green)' : 'rgba(239, 68, 68, 0.2)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  maxHeight: '150px',
                  overflowY: 'auto',
                  marginBottom: 'var(--spacing-md)'
                }}>
                  <div style={{ fontWeight: 700 }}>{uploadResult.success ? '✅ Berhasil!' : '⚠️ Terjadi Kesalahan:'}</div>
                  <div>{uploadResult.message}</div>
                  {uploadResult.warnings && uploadResult.warnings.length > 0 && (
                    <div style={{ marginTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '4px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--gold-400)' }}>Peringatan Baris Dilewati:</div>
                      <ul style={{ paddingLeft: '1rem', listStyleType: 'disc' }}>
                        {uploadResult.warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="btn-add-karyawan"
                disabled={isUploading || !csvFile}
                style={{ width: '100%', justifyContent: 'center', height: '42px' }}
              >
                {isUploading ? 'Mengunggah...' : 'Unggah Karyawan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Component */}
      <ConfirmationDialog
        isOpen={confirmData.isOpen}
        onClose={() => setConfirmData(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmData.onConfirm}
        title={confirmData.title}
        message={confirmData.message}
        confirmText={confirmData.confirmText}
        type={confirmData.type}
        isLoading={false}
      />
    </div>
  )
}
