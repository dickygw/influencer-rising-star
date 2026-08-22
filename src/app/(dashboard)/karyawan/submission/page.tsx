import { getContentTypes, getDailyQuota } from './actions'
import SubmissionClient from './submission-client'

export const dynamic = 'force-dynamic'

export default async function KaryawanSubmissionPage() {
  // Fetch initial data concurrently on server side
  const [contentTypesRes, quotaRes] = await Promise.all([
    getContentTypes(),
    getDailyQuota(),
  ])

  const contentTypes = contentTypesRes.success && contentTypesRes.data ? contentTypesRes.data : []
  const initialQuota = {
    quotaRemaining: quotaRes.success && typeof quotaRes.quotaRemaining === 'number' ? quotaRes.quotaRemaining : 3,
    submittedToday: quotaRes.success && typeof quotaRes.submittedToday === 'number' ? quotaRes.submittedToday : 0,
  }

  return (
    <SubmissionClient
      contentTypes={contentTypes}
      initialQuota={initialQuota}
    />
  )
}
