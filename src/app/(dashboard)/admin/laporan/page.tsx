import { getKanwilStats, getBranchPerformance } from './actions'
import LaporanClient from './laporan-client'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default async function AdminLaporanPage() {
  const [statsRes, branchRes] = await Promise.all([
    getKanwilStats(),
    getBranchPerformance(),
  ])

  const stats = statsRes.success && statsRes.stats ? statsRes.stats : { totalPoints: 0, approvedPosts: 0, activeEmployees: 0 }
  const branchData = branchRes.success && branchRes.data ? branchRes.data : []

  return <LaporanClient stats={stats} branchData={branchData} />
}
