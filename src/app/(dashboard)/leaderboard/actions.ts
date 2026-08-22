'use server'

import { createClient } from '@/lib/supabase/server'

async function getUserContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('users')
    .select('id, kanwil_id')
    .eq('auth_uid', user.id)
    .single()

  if (!profile) throw new Error('User profile not found')

  return { supabase, kanwilId: profile.kanwil_id }
}

// Fetch individual employees leaderboard
export async function getIndividuLeaderboard() {
  try {
    const { supabase, kanwilId } = await getUserContext()

    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        nama,
        nip,
        role,
        cabang:cabang_id (nama),
        points_ledger:points_ledger!points_ledger_user_id_fkey (points)
      `)
      .eq('kanwil_id', kanwilId)
      .eq('role', 'karyawan')
      .eq('status', 'active')

    if (error) throw error

    // Calculate sum of points for each user in JS
    const leaderboard = (users || []).map((user: any) => {
      const totalPoints = (user.points_ledger || []).reduce(
        (sum: number, item: any) => sum + item.points,
        0
      )
      return {
        id: user.id,
        nama: user.nama,
        nip: user.nip,
        cabang: user.cabang?.nama || '-',
        totalPoints,
      }
    })

    // Sort by points descending
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints)

    return { success: true, data: leaderboard }
  } catch (error: any) {
    console.error('Error fetching individual leaderboard:', error.message)
    return { success: false, error: 'Terjadi kesalahan sistem. Silakan coba lagi.' }
  }
}

// Fetch cabang leaderboard
export async function getCabangLeaderboard() {
  try {
    const { supabase, kanwilId } = await getUserContext()

    const { data: cabang, error } = await supabase
      .from('cabang')
      .select(`
        id,
        nama,
        users (
          points_ledger:points_ledger!points_ledger_user_id_fkey (points)
        )
      `)
      .eq('kanwil_id', kanwilId)

    if (error) throw error

    // Calculate sum of points for each cabang in JS
    const leaderboard = (cabang || []).map((c: any) => {
      let totalPoints = 0
      if (c.users) {
        c.users.forEach((user: any) => {
          if (user.points_ledger) {
            user.points_ledger.forEach((item: any) => {
              totalPoints += item.points
            })
          }
        })
      }
      return {
        id: c.id,
        nama: c.nama,
        totalPoints,
      }
    })

    // Sort by points descending
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints)

    return { success: true, data: leaderboard }
  } catch (error: any) {
    console.error('Error fetching cabang leaderboard:', error.message)
    return { success: false, error: 'Terjadi kesalahan sistem. Silakan coba lagi.' }
  }
}
