import createIntlMiddleware from 'next-intl/middleware'
import { auth } from './src/auth'
import { routing } from './src/i18n/routing'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const intlMiddleware = createIntlMiddleware(routing)

const VALID_LOCALES = ['fr', 'en'] as const

function getLocaleFromPath(pathname: string): string {
  const segment = pathname.split('/')[1]
  return VALID_LOCALES.includes(segment as (typeof VALID_LOCALES)[number]) ? segment : 'fr'
}

function isProtectedEspaceClient(pathname: string): boolean {
  if (!pathname.includes('/espace-client')) return false
  // Auth pages are public within espace-client
  const publicSuffixes = ['/connexion', '/inscription', '/mot-de-passe-oublie']
  return !publicSuffixes.some((s) => pathname.endsWith(s))
}

export default auth(function middleware(req: NextRequest & { auth: unknown }) {
  const { pathname } = req.nextUrl
  const session = (req as NextRequest & { auth: Record<string, unknown> | null }).auth

  if (isProtectedEspaceClient(pathname)) {
    if (!session) {
      const locale = getLocaleFromPath(pathname)
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = `/${locale}/espace-client/connexion`
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return intlMiddleware(req)
})

export const config = {
  // Match all request paths except for Next.js internals, API routes, and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}

