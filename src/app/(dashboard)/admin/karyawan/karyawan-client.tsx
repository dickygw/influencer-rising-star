'use client'

import { useState, useTransition } from 'react'
import KaryawanModal from './karyawan-modal'
import { getKaryawanList, bulkUploadKaryawan, syncEmployeeEngagement } from './actions'
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
  const [syncingId, setSyncingId] = useState<string | null>(null)

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

  const handleSync = async (employeeId: string) => {
    setSyncingId(employeeId)
    try {
      const res = await syncEmployeeEngagement(employeeId)
      if (res.success) {
        alert(res.message)
        await handleRefresh()
      } else {
        alert(`Gagal sinkronisasi: ${res.error}`)
      }
    } catch (err: any) {
      alert(`Terjadi kesalahan: ${err.message}`)
    } finally {
      setSyncingId(null)
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
        return <span className="status-pill status-pill--active">Aktif</span>
      case 'inactive':
        return <span className="status-pill status-pill--inactive">Nonaktif</span>
      case 'suspended':
        return <span className="status-pill status-pill--suspended">Ditangguhkan</span>
      default:
        return <span className="status-pill">{status}</span>
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
          padding: 0.75rem 1.25rem;
          background: var(--gradient-green);
          color: var(--text-on-gold);
          font-weight: 700;
          font-size: 0.875rem;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-green);
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          transition: all var(--transition-fast);
        }

        .btn-add-karyawan:hover {
          transform: translateY(-1px);
        }

        /* Filter Controls */
        .filter-container {
          display: flex;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-xl);
          flex-wrap: wrap;
        }

        .search-input-wrapper {
          flex: 1;
          min-width: 250px;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: var(--spacing-md);
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 0.625rem 1rem 0.625rem 2.5rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          outline: none;
          transition: all var(--transition-fast);
        }

        .search-input:focus {
          border-color: var(--green-light);
          box-shadow: 0 0 0 3px rgba(117, 192, 68, 0.1);
        }

        .select-filter {
          padding: 0.625rem 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          outline: none;
          min-width: 180px;
          appearance: auto;
        }

        .select-filter:focus {
          border-color: var(--green-light);
        }

        /* Table Design */
        .table-wrapper {
          background: var(--gradient-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }

        .karyawan-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .karyawan-table th {
          padding: var(--spacing-lg) var(--spacing-xl);
          background: rgba(0, 0, 0, 0.2);
          color: var(--text-secondary);
          font-size: 0.8125rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-subtle);
        }

        .karyawan-table td {
          padding: var(--spacing-lg) var(--spacing-xl);
          border-bottom: 1px solid var(--border-subtle);
          color: var(--text-primary);
          font-size: 0.9375rem;
        }

        .karyawan-table tr:last-child td {
          border-bottom: none;
        }

        .karyawan-table tr:hover td {
          background: rgba(255, 255, 255, 0.01);
        }

        .emp-name-cell {
          font-weight: 600;
          color: var(--text-primary);
        }

        .emp-sub-cell {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        /* Status Pills */
        .status-pill {
          display: inline-flex;
          padding: 0.25rem 0.625rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-pill--active {
          background: rgba(13, 169, 77, 0.15);
          color: var(--green-light);
          border: 1px solid rgba(13, 169, 77, 0.3);
        }

        .status-pill--inactive {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          border: 1px solid var(--border-default);
        }

        .status-pill--suspended {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .btn-action-edit {
          padding: 0.375rem 0.75rem;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--gold-400);
          font-size: 0.8125rem;
          font-weight: 600;
          transition: all var(--transition-fast);
        }

        .btn-action-edit:hover {
          background: rgba(251, 197, 19, 0.1);
          border-color: var(--gold-400);
        }

        .empty-state {
          padding: var(--spacing-3xl);
          text-align: center;
          color: var(--text-secondary);
        }
      `}</style>

      <div className="karyawan-header-section animate-fade-in">
        <div>
          <h1 className="dashboard-greeting" style={{ margin: 0 }}>Kelola Karyawan</h1>
          <p className="dashboard-date" style={{ marginTop: '4px' }}>
            Daftar karyawan yang terdaftar di bawah Kantor Wilayah Anda.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <button
            className="btn-add-karyawan"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', boxShadow: 'none' }}
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
      <div className="filter-container animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Cari NIP, nama, atau jabatan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="select-filter"
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

      {/* Employees Table */}
      <div className="table-wrapper animate-fade-in" style={{ animationDelay: '200ms' }}>
        <div className="responsive-table-wrapper">
          <table className="karyawan-table">
            <thead>
              <tr>
                <th>NIP / Karyawan</th>
                <th>Cabang</th>
                <th>Jabatan</th>
                <th>Akun Sosmed</th>
                <th>Engagement Konten</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredKaryawan.length > 0 ? (
                filteredKaryawan.map((karyawan) => {
                  // Compute employee total engagement stats
                  let totalLikes = 0
                  let totalViews = 0
                  let totalPosts = 0

                  if (karyawan.posts && karyawan.posts.length > 0) {
                    karyawan.posts.forEach((post: any) => {
                      if (post.status === 'approved') {
                        totalPosts++
                        const stats = post.post_engagement_stats
                        if (stats && stats.length > 0) {
                          stats.forEach((stat: any) => {
                            totalLikes += stat.likes || 0
                            totalViews += stat.views || 0
                          })
                        }
                      }
                    })
                  }

                  return (
                    <tr key={karyawan.id}>
                      <td>
                        <div className="emp-name-cell">{karyawan.nama}</div>
                        <div className="emp-sub-cell">NIP: {karyawan.nip}</div>
                      </td>
                      <td>{karyawan.cabang?.nama || '-'}</td>
                      <td>{karyawan.jabatan || '-'}</td>
                      <td>
                        {karyawan.social_accounts && karyawan.social_accounts.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {karyawan.social_accounts.map((acc: any) => (
                              <span 
                                key={`${acc.platform}-${acc.handle}`} 
                                style={{ 
                                  fontSize: '0.75rem', 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '4px',
                                  background: 'var(--bg-secondary)',
                                  padding: '2px 6px',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-default)',
                                  width: 'fit-content'
                                }}
                              >
                                {acc.platform === 'instagram' ? '📸' : 
                                 acc.platform === 'tiktok' ? '📱' : 
                                 acc.platform === 'facebook' ? '👥' : '🐦'}
                                <strong style={{ color: 'var(--text-primary)' }}>@{acc.handle}</strong>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum tautkan</span>
                        )}
                      </td>
                      <td>
                        {totalPosts > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div>
                              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--green-light)' }}>👍 {totalLikes} Likes</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>👀 {totalViews} Views ({totalPosts} Post)</div>
                            </div>
                            <button
                              onClick={() => setConfirmData({
                                isOpen: true,
                                type: 'info',
                                title: 'Sinkronisasi Engagement?',
                                message: `Apakah Anda yakin ingin menyinkronkan data interaksi (Likes/Views) secara live menggunakan Instagram Scraper untuk karyawan "${karyawan.nama}"?`,
                                confirmText: 'Ya, Sinkronkan',
                                onConfirm: async () => {
                                  setConfirmData(prev => ({ ...prev, isOpen: false }))
                                  await handleSync(karyawan.id)
                                }
                              })}
                              disabled={syncingId === karyawan.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-default)',
                                borderRadius: '4px',
                                padding: '2px 8px',
                                fontSize: '0.7rem',
                                color: 'var(--text-primary)',
                                cursor: syncingId === karyawan.id ? 'not-allowed' : 'pointer',
                                width: 'fit-content',
                                transition: 'all 0.2s',
                              }}
                              title="Sinkronisasikan engagement likes/views postingan karyawan secara live dari Instagram"
                            >
                              {syncingId === karyawan.id ? '🌀 Syncing...' : '🔄 Sync Engagement'}
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td>{getStatusBadge(karyawan.status)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn-action-edit"
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
                  <td colSpan={7} className="empty-state">
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
        isLoading={syncingId !== null}
      />
    </div>
  )
}
