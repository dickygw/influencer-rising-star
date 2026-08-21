'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getKaryawanContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('users')
    .select('id, nip, nama')
    .eq('auth_uid', user.id)
    .single()

  if (!profile) throw new Error('User profile not found')

  return { supabase, userId: profile.id, nip: profile.nip, nama: profile.nama }
}

// Fetch linked social accounts & referral stats for current user
export async function getSocialAccounts() {
  try {
    const { supabase, userId } = await getKaryawanContext()

    // 1. Ambil akun sosial
    const { data: accounts, error } = await supabase
      .from('social_accounts')
      .select('id, platform, handle, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw error

    // 2. Ambil total klik dari link_clicks untuk user ini
    let totalClicks = 0
    try {
      const { count } = await supabase
        .from('link_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      totalClicks = count || 0
    } catch {
      // Table might not exist yet
    }

    // 3. Ambil info kampanye aktif
    let activeCampaign = {
      campaignName: 'Promo Tabungan Emas Pegadaian',
      destinationUrl: 'https://www.pegadaian.co.id/produk/tabungan-emas',
    }

    try {
      const { data: camp } = await supabase
        .from('campaign_settings')
        .select('campaign_name, destination_url')
        .eq('id', 'default')
        .maybeSingle()

      if (camp) {
        activeCampaign = {
          campaignName: camp.campaign_name || activeCampaign.campaignName,
          destinationUrl: camp.destination_url || activeCampaign.destinationUrl,
        }
      }
    } catch {
      // Fallback
    }

    return {
      success: true,
      data: accounts || [],
      totalClicks,
      activeCampaign,
    }
  } catch (error: any) {
    console.error('Error fetching social accounts:', error.message)
    return { success: false, error: error.message }
  }
}

// Link a new social handle
export async function linkSocialAccount(platform: string, handle: string) {
  try {
    const { supabase, userId } = await getKaryawanContext()

    const sanitizedHandle = handle.trim().replace(/^@+/, '')
    if (!sanitizedHandle) {
      return { success: false, error: 'Username/handle tidak boleh kosong' }
    }

    const { error } = await supabase.from('social_accounts').insert({
      user_id: userId,
      platform: platform.toLowerCase(),
      handle: sanitizedHandle,
    })

    if (error) {
      if (error.message.includes('unique') || error.code === '23505') {
        return { success: false, error: `Username @${sanitizedHandle} untuk platform ${platform} sudah ditautkan` }
      }
      throw error
    }

    revalidatePath('/karyawan/sosmed')
    return { success: true }
  } catch (error: any) {
    console.error('Error linking social account:', error.message)
    return { success: false, error: error.message }
  }
}

// Unlink social account
export async function unlinkSocialAccount(id: string) {
  try {
    const { supabase, userId } = await getKaryawanContext()

    const { error } = await supabase
      .from('social_accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    revalidatePath('/karyawan/sosmed')
    return { success: true }
  } catch (error: any) {
    console.error('Error unlinking social account:', error.message)
    return { success: false, error: error.message }
  }
}
