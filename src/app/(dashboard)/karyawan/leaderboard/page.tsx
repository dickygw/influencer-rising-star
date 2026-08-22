import { getIndividuLeaderboard, getCabangLeaderboard } from '../../leaderboard/actions'
import LeaderboardClient from '../../leaderboard/leaderboard-client'

export const dynamic = 'force-dynamic'

export default async function KaryawanLeaderboardPage() {
  const [individuRes, cabangRes] = await Promise.all([
    getIndividuLeaderboard(),
    getCabangLeaderboard(),
  ])

  const individu = individuRes.success && individuRes.data ? individuRes.data : []
  const cabang = cabangRes.success && cabangRes.data ? cabangRes.data : []

  return <LeaderboardClient initialIndividu={individu} initialCabang={cabang} />
}
