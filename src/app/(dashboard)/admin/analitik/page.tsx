import { getAnalyticsData } from './actions'
import AnalitikClient from './analitik-client'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default async function AdminAnalitikPage() {
  const res = await getAnalyticsData()

  const initialData = res.success && res.data ? res.data : {
    summary: {
      totalPosts: 0,
      totalLikes: 0,
      totalViews: 0,
      totalComments: 0,
      totalAdvocates: 0,
      totalEmployees: 0,
      advocacyParticipationRate: 0,
      totalPotentialReach: 0,
      avgEngagementRate: 0,
      avgLikesPerPost: 0,
      avgViewsPerPost: 0,
      totalLinkClicks: 0,
      bioLinkActiveAdvocates: 0,
      bioLinkActiveRate: 0,
      activeDestinationUrl: 'https://www.pegadaian.co.id/produk/tabungan-emas',
      activeCampaignName: 'Promo Tabungan Emas Pegadaian',
      lastSyncedAt: null,
    },
    advocates: [],
    topPosts: [],
    branches: [],
    cabangList: []
  }

  return <AnalitikClient initialData={initialData} />
}
