import createIntlMiddleware from 'next-intl/middleware'
import { getToken } from 'next-auth/jwt'
import { routing } from './src/i18n/routing'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const intlMiddleware = createIntlMiddleware(routing)

const VALID_LOCALES = ['fr', 'en'] as const

function getLocaleFromPath(pathname: string): string {
  const segment = pathname.split('/')[1]
  return VALID_LOCALES.includes(segment as (typeof VALID_LOCALES)[number])
    ? segment
    : 'fr'
}

function isProtectedEspaceClient(pathname: string): boolean {
  if (!pathname.includes('/espace-client')) return false
  // Auth pages are public within espace-client
  const publicSuffixes = ['/connexion', '/inscription', '/mot-de-passe-oublie']
  return !publicSuffixes.some((s) => pathname.endsWith(s))
}

function isEspaceClientAuthPage(pathname: string): boolean {
  if (!pathname.includes('/espace-client')) return false
  const publicSuffixes = ['/connexion', '/inscription', '/mot-de-passe-oublie']
  return publicSuffixes.some((s) => pathname.endsWith(s))
}

function isSafeClientAreaPath(pathname: string, locale: string): boolean {
  if (!pathname.startsWith(`/${locale}/espace-client/`)) return false
  const authSuffixes = ['/connexion', '/inscription', '/mot-de-passe-oublie']
  return !authSuffixes.some((s) => pathname.endsWith(s))
}

function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  // Use btoa + fromCharCode — Buffer is not available in Edge Runtime (middleware)
  return btoa(String.fromCharCode(...bytes))
}

function buildCsp(nonce: string): string {
  const strapiOrigin =
    process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
  const allowedOriginsEnv =
    process.env.ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_ALLOWED_ORIGINS
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const isProd = process.env.NODE_ENV === 'production'

  const frameAncestorParts = [`'self'`, strapiOrigin]
  if (allowedOriginsEnv) {
    allowedOriginsEnv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((u) => frameAncestorParts.push(u))
  } else {
    frameAncestorParts.push(siteOrigin)
  }

  const directives = [
    "default-src 'self'",
    // Cloudinary images + Stripe fraud detection pixel
    `img-src 'self' data: https://res.cloudinary.com https://q.stripe.com ${strapiOrigin}`,
    // Nonce replaces 'unsafe-inline'; unsafe-eval only kept in dev for Fast Refresh
    // Stripe.js must load from its CDN for PCI compliance
    `script-src 'self' 'nonce-${nonce}' https://js.stripe.com${isProd ? '' : " 'unsafe-eval'"}`,
    "style-src 'self'",
    "style-src-attr 'unsafe-inline'",
    // Stripe API calls + Strapi
    `connect-src 'self' ${strapiOrigin} https://api.stripe.com https://r.stripe.com`,
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Stripe 3DS / card element iframes
    `frame-src 'self' https://js.stripe.com https://hooks.stripe.com`,
    `frame-ancestors ${frameAncestorParts.join(' ')}`,
    'upgrade-insecure-requests',
  ]

  return directives.join('; ')
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const locale = getLocaleFromPath(pathname)
  const protectedClientArea = isProtectedEspaceClient(pathname)
  const authClientAreaPage = isEspaceClientAuthPage(pathname)

  // Stripe CLI often forwards to /webhook in local dev: keep it out of locale/auth middleware.
  if (pathname === '/webhook' || pathname === '/webhook/') {
    return NextResponse.next()
  }

  if (protectedClientArea || authClientAreaPage) {
    // Use getToken instead of auth() wrapper — auth() strips custom response headers
    let token = null
    try {
      token = await getToken({
        req,
        secret: process.env.AUTH_SECRET,
      })
    } catch {
      // getToken failure should not block the request — treat as unauthenticated
    }

    if (protectedClientArea && !token) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = `/${locale}/espace-client/connexion`
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (authClientAreaPage && token) {
      const from = req.nextUrl.searchParams.get('from')
      const fallbackPath = `/${locale}/espace-client/tableau-de-bord`
      const redirectPath =
        from && isSafeClientAreaPath(from, locale) ? from : fallbackPath
      const dashboardUrl = req.nextUrl.clone()
      dashboardUrl.pathname = redirectPath
      dashboardUrl.search = ''
      return NextResponse.redirect(dashboardUrl)
    }
  }

  // Generate a per-request nonce for CSP.
  const nonce = generateNonce()
  const csp = buildCsp(nonce)

  // Run intl middleware first to get its routing decision (locale redirect / cookie).
  const intlResponse = intlMiddleware(req)
  const intlStatus = intlResponse.status

  // If intl wants to redirect (missing locale prefix, etc.), preserve it and add CSP.
  if (
    intlStatus === 301 ||
    intlStatus === 302 ||
    intlStatus === 307 ||
    intlStatus === 308
  ) {
    intlResponse.headers.set('Content-Security-Policy', csp)
    return intlResponse
  }

  // Forward nonce to Server Components via request headers.
  // NextResponse.next({ request: { headers } }) is the only mechanism Next.js uses
  // to pass middleware-set data to the RSC render (read via `headers()` in layout).
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  // Preserve cookies and other headers set by intl middleware (e.g. NEXT_LOCALE).
  intlResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'content-security-policy') {
      response.headers.append(key, value)
    }
  })

  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  // Match all request paths except for Next.js internals, API routes, and static files
  matcher: ['/((?!api|webhook|_next|_vercel|.*\\..*).*)'],
}
