'use server'

import { createClient as createSSRClient } from '@/lib/supabase/server'
import { createClient as createBaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Standalone client to register users in Auth without altering current session cookies
function getStandaloneClient() {
  return createBaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}

export type KaryawanData = {
  id?: string
  nip: string
  nama: string
  email?: string
  no_hp?: string
  jabatan?: string
  cabang_id: string
  status: 'active' | 'inactive' | 'suspended'
  password?: string
}

// Fetch current admin's kanwil and profiles
async function getAdminContext() {
  const supabase = await createSSRClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('users')
    .select('id, kanwil_id, role')
    .eq('auth_uid', user.id)
    .single()

  if (!profile || (profile.role !== 'admin_kanwil' && profile.role !== 'admin_pusat')) {
    throw new Error('Unauthorized role')
  }

  return { supabase, adminId: profile.id, kanwilId: profile.kanwil_id }
}

// Fetch all branches under current admin's kanwil
export async function getCabangList() {
  try {
    const { supabase, kanwilId } = await getAdminContext()
    const { data, error } = await supabase
      .from('cabang')
      .select('id, kode_cabang, nama')
      .eq('kanwil_id', kanwilId)
      .order('nama', { ascending: true })

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    console.error('Error fetching cabang:', error.message)
    return { success: false, error: error.message }
  }
}

// Fetch all employees under current admin's kanwil (with social handles and engagement stats)
export async function getKaryawanList() {
  try {
    const { supabase, kanwilId } = await getAdminContext()
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        auth_uid,
        nip,
        nama,
        email,
        no_hp,
        jabatan,
        status,
        role,
        cabang:cabang_id (id, nama),
        social_accounts (platform, handle, is_verified),
        posts:posts!user_id (
          id,
          status,
          post_engagement_stats (likes, comments, views)
        )
      `)
      .eq('kanwil_id', kanwilId)
      .eq('role', 'karyawan') // Only manage employees (not other admins)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    console.error('Error fetching karyawan:', error.message)
    return { success: false, error: error.message }
  }
}

// Create a new employee (Auth + User Profile)
export async function createKaryawan(data: KaryawanData) {
  try {
    const { supabase, adminId, kanwilId } = await getAdminContext()

    if (!data.password || data.password.length < 6) {
      return { success: false, error: 'Password minimal 6 karakter' }
    }

    const email = `${data.nip.toLowerCase().trim()}@irs.pegadaian.internal`

    // 1. Create auth user with standalone client
    const standalone = getStandaloneClient()
    const { data: authData, error: authErr } = await standalone.auth.signUp({
      email,
      password: data.password,
    })

    if (authErr) {
      if (authErr.message.includes('already registered') || authErr.code === 'user_already_exists') {
        return { success: false, error: `Karyawan dengan NIP ${data.nip} sudah terdaftar di sistem Auth` }
      }
      throw authErr
    }

    const authUid = authData.user?.id
    if (!authUid) throw new Error('Gagal mendapatkan User UID dari Supabase Auth')

    // 2. Insert profile into public.users using admin's context
    const { error: profileErr } = await supabase.from('users').insert({
      auth_uid: authUid,
      nip: data.nip.trim(),
      nama: data.nama.trim(),
      email: data.email?.trim() || null,
      no_hp: data.no_hp?.trim() || null,
      jabatan: data.jabatan?.trim() || null,
      cabang_id: parseInt(data.cabang_id),
      kanwil_id: kanwilId,
      role: 'karyawan',
      status: data.status,
      managed_by: adminId,
    })

    if (profileErr) {
      // Cleanup auth user on profile insertion failure
      // (Bisa terjadi jika NIP melanggar unique constraint di table public.users)
      console.error('Profile insertion failed, profile error:', profileErr.message)
      return { success: false, error: `Gagal membuat profil: NIP mungkin sudah terdaftar di database` }
    }

    revalidatePath('/admin/karyawan')
    return { success: true }
  } catch (error: any) {
    console.error('Error creating karyawan:', error.message)
    return { success: false, error: error.message }
  }
}

// Update an existing employee profile
export async function updateKaryawan(id: string, data: Partial<KaryawanData>) {
  try {
    const { supabase } = await getAdminContext()

    const { error } = await supabase
      .from('users')
      .update({
        nama: data.nama?.trim(),
        email: data.email?.trim() || null,
        no_hp: data.no_hp?.trim() || null,
        jabatan: data.jabatan?.trim() || null,
        cabang_id: data.cabang_id ? parseInt(data.cabang_id) : undefined,
        status: data.status,
      })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/admin/karyawan')
    return { success: true }
  } catch (error: any) {
    console.error('Error updating karyawan:', error.message)
    return { success: false, error: error.message }
  }
}

// Simple RFC-compliant CSV parser
function parseCSV(text: string) {
  const lines = text.split(/\r?\n/)
  const results: string[][] = []
  for (const line of lines) {
    if (!line.trim()) continue
    
    const row: string[] = []
    let inQuotes = false
    let currentVal = ''
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        row.push(currentVal.trim())
        currentVal = ''
      } else {
        currentVal += char
      }
    }
    row.push(currentVal.trim())
    results.push(row)
  }
  return results
}

// Bulk upload employees from CSV
export async function bulkUploadKaryawan(csvText: string) {
  try {
    const { supabase, adminId, kanwilId } = await getAdminContext()

    // 1. Parse CSV
    const rows = parseCSV(csvText)
    if (rows.length < 2) {
      return { success: false, error: 'File CSV kosong atau tidak valid.' }
    }

    const headers = rows[0].map(h => h.toLowerCase().trim())
    const nipIdx = headers.indexOf('nip')
    const namaIdx = headers.indexOf('nama')
    const emailIdx = headers.indexOf('email')
    const hpIdx = headers.indexOf('no_hp')
    const jabatanIdx = headers.indexOf('jabatan')
    const cabangIdx = headers.indexOf('kode_cabang')

    if (nipIdx === -1 || namaIdx === -1 || cabangIdx === -1) {
      return { success: false, error: 'Kolom CSV minimal harus memuat header: nip, nama, kode_cabang' }
    }

    // 2. Fetch all branches under this kanwil to map branch code
    const { data: branches, error: branchesErr } = await supabase
      .from('cabang')
      .select('id, kode_cabang')
      .eq('kanwil_id', kanwilId)

    if (branchesErr) throw branchesErr

    const branchMap = new Map<string, number>()
    branches?.forEach((b) => {
      branchMap.set(b.kode_cabang.toLowerCase().trim(), parseInt(b.id))
    })

    // 2b. Parse and identify branches in CSV that do not exist yet, then auto-insert them
    const newBranchesToInsert: { kode_cabang: string; nama: string; kanwil_id: number }[] = []
    const processedBranchCodes = new Set<string>()

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (row.length < 3) continue
      const rawBranchVal = row[cabangIdx]?.trim()
      if (!rawBranchVal) continue

      let code = rawBranchVal
      let name = rawBranchVal

      if (rawBranchVal.includes(':')) {
        const parts = rawBranchVal.split(':')
        code = parts[0].trim()
        name = parts[1] ? parts[1].trim() : parts[0].trim()
      }

      const lowerCode = code.toLowerCase().trim()
      if (!branchMap.has(lowerCode) && !processedBranchCodes.has(lowerCode)) {
        processedBranchCodes.add(lowerCode)
        newBranchesToInsert.push({
          kode_cabang: code,
          nama: name,
          kanwil_id: kanwilId,
        })
      }
    }

    if (newBranchesToInsert.length > 0) {
      const { data: insertedBranches, error: branchInsertErr } = await supabase
        .from('cabang')
        .insert(newBranchesToInsert)
        .select('id, kode_cabang')

      if (branchInsertErr) {
        console.error('Error auto-creating branches:', branchInsertErr.message)
        throw branchInsertErr
      }

      insertedBranches?.forEach((b) => {
        branchMap.set(b.kode_cabang.toLowerCase().trim(), parseInt(b.id))
      })
    }

    // 2c. Fetch existing employees in this kanwil to perform delta check
    const { data: existingUsers, error: extErr } = await supabase
      .from('users')
      .select('id, nip, nama, email, no_hp, jabatan, cabang_id')
      .eq('kanwil_id', kanwilId)
      .eq('role', 'karyawan')

    if (extErr) throw extErr

    const existingMap = new Map<string, any>()
    existingUsers?.forEach((u) => {
      existingMap.set(u.nip.trim().toLowerCase(), u)
    })

    // 3. Prepare records
    const usersToInsert: any[] = []
    const usersToUpdate: any[] = []
    const invalidRows: string[] = []

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (row.length < 3) continue

      const nip = row[nipIdx]?.trim()
      const nama = row[namaIdx]?.trim()
      const email = emailIdx !== -1 ? row[emailIdx]?.trim() || null : null
      const no_hp = hpIdx !== -1 ? row[hpIdx]?.trim() || null : null
      const jabatan = jabatanIdx !== -1 ? row[jabatanIdx]?.trim() || null : null
      
      const rawBranchVal = cabangIdx !== -1 ? row[cabangIdx]?.trim() : ''
      let code = rawBranchVal
      if (rawBranchVal.includes(':')) {
        code = rawBranchVal.split(':')[0].trim()
      }
      const lowerCode = code.toLowerCase().trim()

      if (!nip || !nama || !rawBranchVal) {
        invalidRows.push(`Baris ${i + 1}: Data NIP/Nama/Cabang kosong`)
        continue
      }

      const branchId = branchMap.get(lowerCode)
      if (!branchId) {
        invalidRows.push(`Baris ${i + 1}: Kode Cabang "${code}" gagal didaftarkan`)
        continue
      }

      const key = nip.toLowerCase()
      if (existingMap.has(key)) {
        const ext = existingMap.get(key)
        
        // Delta check for mutations
        const hasChanges =
          ext.nama !== nama ||
          ext.email !== email ||
          ext.no_hp !== no_hp ||
          ext.jabatan !== jabatan ||
          parseInt(ext.cabang_id) !== branchId

        if (hasChanges) {
          usersToUpdate.push({
            id: ext.id,
            nama,
            email,
            no_hp,
            jabatan,
            cabang_id: branchId,
          })
        }
      } else {
        usersToInsert.push({
          auth_uid: null, // Lazy signup triggers on login
          nip,
          nama,
          email,
          no_hp,
          jabatan,
          cabang_id: branchId,
          kanwil_id: kanwilId,
          role: 'karyawan',
          status: 'active',
          managed_by: adminId,
        })
      }
    }

    // 4. Perform insertions
    if (usersToInsert.length > 0) {
      const { error: insertErr } = await supabase
        .from('users')
        .insert(usersToInsert)

      if (insertErr) {
        console.error('Bulk insert error:', insertErr.message)
        throw insertErr
      }
    }

    // 5. Perform updates sequentially (only for mutated employees)
    let updatedCount = 0
    if (usersToUpdate.length > 0) {
      for (const u of usersToUpdate) {
        const { error: updateErr } = await supabase
          .from('users')
          .update({
            nama: u.nama,
            email: u.email,
            no_hp: u.no_hp,
            jabatan: u.jabatan,
            cabang_id: u.cabang_id,
          })
          .eq('id', u.id)

        if (updateErr) {
          console.error(`Error updating mutated NIP:`, updateErr.message)
        } else {
          updatedCount++
        }
      }
    }

    revalidatePath('/admin/karyawan')
    
    return {
      success: true,
      insertedCount: usersToInsert.length,
      message: `Berhasil memproses: ${usersToInsert.length} karyawan baru ditambahkan, ${updatedCount} karyawan mengalami mutasi/pembaruan data.`,
      warnings: invalidRows.length > 0 ? invalidRows : null,
    }
  } catch (error: any) {
    console.error('Error bulk uploading karyawan:', error.message)
    return { success: false, error: error.message }
  }
}

// =========================================================================
// FUNGSI: syncEmployeeEngagement
// Kegunaan: Sinkronisasi ulang metrik interaksi (likes, comments, views) dari seluruh
//           postingan Instagram karyawan yang sudah disetujui (Approved).
//           Fungsi ini dipicu secara manual (on-demand) oleh Admin Kanwil.
// =========================================================================
export async function syncEmployeeEngagement(employeeId: string) {
  try {
    const { supabase } = await getAdminContext() // Pastikan pengakses adalah Admin Kanwil sah

    // 1. Ambil semua postingan Instagram yang berstatus disetujui (approved) milik karyawan ini
    const { data: posts, error: postsErr } = await supabase
      .from('posts')
      .select('id, post_url')
      .eq('user_id', employeeId)
      .eq('platform', 'instagram')
      .eq('status', 'approved')

    if (postsErr) throw postsErr
    if (!posts || posts.length === 0) {
      return { success: true, message: 'Karyawan ini belum memiliki postingan Instagram terverifikasi (Approved).' }
    }

    const apifyToken = process.env.APIFY_TOKEN
    if (!apifyToken) {
      return { success: false, error: 'APIFY_TOKEN belum terkonfigurasi di server.' }
    }

    const { ApifyClient } = await import('apify-client')
    const client = new ApifyClient({ token: apifyToken })

    // Ambil data handle sosial media karyawan
    const { data: socialAccount } = await supabase
      .from('social_accounts')
      .select('handle')
      .eq('user_id', employeeId)
      .eq('platform', 'instagram')
      .maybeSingle()

    const handle = socialAccount?.handle || 'instagram'

    let updatedCount = 0

    // Loop data untuk setiap postingan approved guna mengambil metrik terbaru dari Instagram via Apify
    for (const post of posts) {
      try {
        console.log(`Syncing stats for post ${post.id}: ${post.post_url}`)
        
        const run = await client.actor('apify/instagram-post-scraper').call({
          username: [handle.replace(/^@/, '')],
          directUrls: [post.post_url],
          resultsLimit: 1
        })

        const { items } = await client.dataset(run.defaultDatasetId).listItems()
        const postData = items[0]

        if (postData) {
          const likes = postData.likesCount || 0
          const comments = postData.commentsCount || 0
          const views = postData.playCount || postData.videoViewCount || 0

          // Periksa apakah statistik postingan sudah ada di database
          const { data: existingStat } = await supabase
            .from('post_engagement_stats')
            .select('id')
            .eq('post_id', post.id)
            .maybeSingle()

          if (existingStat) {
            // Perbarui data metrik yang ada
            const { error: updateErr } = await supabase
              .from('post_engagement_stats')
              .update({
                likes,
                comments,
                views,
                fetched_at: new Date().toISOString()
              })
              .eq('id', existingStat.id)
            
            if (updateErr) throw updateErr
          } else {
            // Masukkan data metrik baru jika belum ada
            const { error: insertErr } = await supabase
              .from('post_engagement_stats')
              .insert({
                post_id: post.id,
                likes,
                comments,
                views
              })
            
            if (insertErr) throw insertErr
          }

          updatedCount++
        }
      } catch (postErr: any) {
        console.error(`Error syncing stats for post ${post.id}:`, postErr.message)
      }
    }

    revalidatePath('/admin/karyawan')
    return { success: true, message: `Berhasil menyinkronkan data: ${updatedCount} dari ${posts.length} postingan berhasil diperbarui.` }
  } catch (error: any) {
    console.error('Error in syncEmployeeEngagement:', error.message)
    return { success: false, error: error.message }
  }
}

