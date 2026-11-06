import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Public site pages that anyone can open without logging in
const PUBLIC_PATHS = ['/', '/creators', '/agents', '/calculator', '/reports']

export async function middleware(req: NextRequest) {
  let res = NextResponse.next()
  const { pathname } = req.nextUrl

  // /demo holds made-up data for showing the apps, never real accounts
  if (PUBLIC_PATHS.includes(pathname) || pathname === '/demo' || pathname.startsWith('/demo/')) {
    return res
  }

  // 1. Create the Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) { req.cookies.set({ name, value, ...options }) },
        remove(name: string, options: CookieOptions) { req.cookies.set({ name, value: '', ...options }) },
      },
    }
  )

  // 2. Check if the user has a session
  const { data: { session } } = await supabase.auth.getSession()

  // 3. Logic: If no session and trying to access protected pages, redirect to login
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')

  if (!session && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

// Skip API routes, Next internals and any static file (logos, icons, images)
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
