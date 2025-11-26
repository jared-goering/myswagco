import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin, hash } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // If there's an OAuth error, redirect to error page
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(`${origin}/auth/auth-error?error=${encodeURIComponent(errorDescription || error)}`)
  }

  // If there's a code (PKCE flow), try to exchange it for a session
  if (code) {
    const cookieStore = cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )

    console.log('[Auth Callback] Attempting to exchange code for session...')
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log('[Auth Callback] Exchange result:', {
      success: !sessionError,
      hasSession: !!data?.session,
      userEmail: data?.session?.user?.email,
      error: sessionError?.message,
    })
    
    if (!sessionError && data?.session) {
      console.log('[Auth Callback] Session exchanged successfully')
      
      // Return an HTML page that sets the session client-side and redirects
      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Redirecting...</title>
  <script>
    // Store the session in localStorage for the client-side Supabase client
    localStorage.setItem(
      'sb-sqaqaaxyfpghtkbzmwei-auth-token',
      ${JSON.stringify(JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
        token_type: data.session.token_type,
        user: data.session.user,
      }))}
    );
    
    // Redirect after a brief moment to ensure storage is written
    setTimeout(function() {
      window.location.href = '${next}';
    }, 200);
  </script>
</head>
<body>
  <p>Signing you in...</p>
</body>
</html>
      `
      
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
        },
      })
    }
    
    console.error('[Auth Callback] Session exchange error:', sessionError)
    // If PKCE exchange failed, might be implicit flow - just redirect and let client handle it
    console.log('[Auth Callback] PKCE exchange failed, redirecting to let client handle implicit flow')
  }

  // No code or PKCE failed - might be implicit flow with hash tokens
  // Redirect to home and let the client-side handle the session from URL hash
  console.log('[Auth Callback] No code or PKCE failed, redirecting to:', next)
  return NextResponse.redirect(`${origin}${next}`)
}
