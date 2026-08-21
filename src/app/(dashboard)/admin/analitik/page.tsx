import { getAnalyticsData } from './actions'
import AnalitikClient from './analitik-client'

export const dynamic = 'force-dynamic'

export default async function AdminAnalitikPage() {
  const res = await getAnalyticsData()

  const initialData = res.success && res.data ? res.data : {
    summary: {
      totalPosts: 0,
      totalLikes: 0,
      totalViews: 0,
      totalComments: 0,
      totalAdvocates: 0,
      avgLikesPerPost: 0,
      lastSyncedAt: null,
    },
    advocates: [],
    topPosts: [],
    branches: [],
    cabangList: []
  }

  return <AnalitikClient initialData={initialData} />
}
