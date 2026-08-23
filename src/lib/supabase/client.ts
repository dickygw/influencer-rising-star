import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | undefined

export function createClient() {
  if (browserClient) return browserClient

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/^["']|["']$/g, '').trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/^["']|["']$/g, '').trim()

  browserClient = createBrowserClient(url, key)
  return browserClient
}
