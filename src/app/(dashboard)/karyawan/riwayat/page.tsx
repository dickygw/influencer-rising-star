import { getRiwayatSubmissions, getPointsSummary } from './actions'
import RiwayatClient from './riwayat-client'

export const dynamic = 'force-dynamic'

export default async function KaryawanRiwayatPage() {
  const [riwayatRes, pointsRes] = await Promise.all([
    getRiwayatSubmissions(),
    getPointsSummary(),
  ])

  const initialSubmissions = riwayatRes.success && riwayatRes.data ? riwayatRes.data : []
  const totalBalance = pointsRes.success && typeof pointsRes.totalBalance === 'number' ? pointsRes.totalBalance : 0

  return (
    <RiwayatClient
      initialSubmissions={initialSubmissions}
      totalBalance={totalBalance}
    />
  )
}
