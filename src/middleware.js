import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  let res = NextResponse.next()

  // 1. Create the Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return req.cookies.get(name)?.value },
        set(name, value, options) { req.cookies.set({ name, value, ...options }) },
        remove(name, options) { req.cookies.set({ name, value: '', ...options }) },
      },
    }
  )

  // 2. Check if the user has a session
  const { data: { session } } = await supabase.auth.getSession()

  // 3. Logic: If no session and trying to access protected pages, redirect to login
  const isAuthPage = req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/register')
  
  if (!session && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

// Ensure middleware only runs on specific routes
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}