import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // =========================================================================
  // GUARD: Validate that required environment variables are set.
  // On Vercel, if these are missing the middleware will crash immediately.
  // =========================================================================
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
    // Let the request through rather than crashing the middleware
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // Public routes that don't require auth (login, referral redirect links, and API routes)
  const publicRoutes = ['/login', '/r', '/api']
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // If not logged in and trying to access protected route → redirect to login
    if (!user && !isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // If logged in, enforce role-based access control on routes
    if (user) {
      // =========================================================================
      // SECURITY: Single Session Enforcement
      // Bandingkan token di cookie dengan token di database.
      // Jika berbeda (login dari device lain), paksa logout sesi ini.
      // =========================================================================
      const cookieSessionToken =
        request.cookies.get('irs_session_token')?.value

      if (cookieSessionToken && !isPublicRoute) {
        try {
          const { data: dbToken } = await supabase.rpc('get_session_token', {
            p_auth_uid: user.id,
          })

          if (dbToken && dbToken !== cookieSessionToken) {
            // Token tidak cocok → sesi ini sudah tidak valid (login dari device lain)
            await supabase.auth.signOut()
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            url.searchParams.set('reason', 'session_expired')
            const response = NextResponse.redirect(url)
            // Hapus cookie session token
            response.cookies.delete('irs_session_token')
            return response
          }
        } catch (err) {
          // Jika RPC gagal, lanjutkan saja (jangan block user)
          console.error('Session token check error:', err)
        }
      }

      // Fetch user profile role
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('auth_uid', user.id)
          .single()

        const isAdmin =
          profile?.role === 'admin_kanwil' || profile?.role === 'admin_pusat'
        const pathname = request.nextUrl.pathname

        // If on login page → redirect to role dashboard
        if (pathname === '/login') {
          const url = request.nextUrl.clone()
          url.pathname = isAdmin ? '/admin' : '/karyawan'
          return NextResponse.redirect(url)
        }

        // Non-admin attempting to access /admin routes → redirect to employee area
        if (pathname.startsWith('/admin') && !isAdmin) {
          const url = request.nextUrl.clone()
          url.pathname = '/karyawan'
          return NextResponse.redirect(url)
        }
      } catch (err) {
        // Jika query profil gagal, lanjutkan tanpa role check
        console.error('Profile fetch error in middleware:', err)
      }
    }
  } catch (err) {
    // Jika getUser() gagal (misalnya Supabase unreachable),
    // lanjutkan request daripada crash seluruh middleware
    console.error('Middleware auth error:', err)
  }

  return supabaseResponse
}
