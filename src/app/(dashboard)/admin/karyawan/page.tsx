import { getKaryawanList, getCabangList } from './actions'
import KaryawanClient from './karyawan-client'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default async function AdminKaryawanPage() {
  // Fetch initial data concurrently on server side
  const [karyawanRes, cabangRes] = await Promise.all([
    getKaryawanList(),
    getCabangList(),
  ])

  const initialKaryawan = karyawanRes.success && karyawanRes.data ? karyawanRes.data : []
  const cabangList = cabangRes.success && cabangRes.data ? cabangRes.data : []

  return (
    <KaryawanClient
      initialKaryawan={initialKaryawan}
      cabangList={cabangList}
    />
  )
}
