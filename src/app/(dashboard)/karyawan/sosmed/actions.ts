'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getKaryawanContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('auth_uid', user.id)
    .single()

  if (!profile) throw new Error('User profile not found')

  return { supabase, userId: profile.id }
}

// Fetch linked social accounts for current user
export async function getSocialAccounts() {
  try {
    const { supabase, userId } = await getKaryawanContext()
    const { data, error } = await supabase
      .from('social_accounts')
      .select('id, platform, handle, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    console.error('Error fetching social accounts:', error.message)
    return { success: false, error: error.message }
  }
}

// Link a new social handle
export async function linkSocialAccount(platform: string, handle: string) {
  try {
    const { supabase, userId } = await getKaryawanContext()

    const sanitizedHandle = handle.trim().replace(/^@/, '') // Remove @ symbol if present
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
      .eq('user_id', userId) // Ensure ownership

    if (error) throw error

    revalidatePath('/karyawan/sosmed')
    return { success: true }
  } catch (error: any) {
    console.error('Error unlinking social account:', error.message)
    return { success: false, error: error.message }
  }
}
