import { getPendingSubmissions } from './actions'
import VerifikasiClient from './verifikasi-client'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default async function AdminVerifikasiPage() {
  const res = await getPendingSubmissions()
  const pendingList = res.success && res.data ? res.data : []

  return <VerifikasiClient initialPending={pendingList} />
}
