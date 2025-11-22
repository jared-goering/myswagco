import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
  
  // Check if the path is an admin route
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Skip auth check for login page
    if (request.nextUrl.pathname === '/admin/login') {
      return res
    }

    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value
            },
            set(name: string, value: string, options: CookieOptions) {
              request.cookies.set({
                name,
                value,
                ...options,
              })
              res = NextResponse.next({
                request: {
                  headers: request.headers,
                },
              })
              res.cookies.set({
                name,
                value,
                ...options,
              })
            },
            remove(name: string, options: CookieOptions) {
              request.cookies.set({
                name,
                value: '',
                ...options,
              })
              res = NextResponse.next({
                request: {
                  headers: request.headers,
                },
              })
              res.cookies.set({
                name,
                value: '',
                ...options,
              })
            },
          },
        }
      )
      
      const { data: { session } } = await supabase.auth.getSession()

      // If no session, redirect to login
      if (!session) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/admin/login'
        redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
      }
    } catch (error) {
      console.error('Auth middleware error:', error)
      // On error, redirect to login
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/admin/login'
      return NextResponse.redirect(redirectUrl)
    }
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*']
}

