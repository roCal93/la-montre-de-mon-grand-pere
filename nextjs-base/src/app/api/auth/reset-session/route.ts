import { NextRequest, NextResponse } from 'next/server'
import { STRAPI_SESSION_COOKIE } from '@/lib/strapi-session-cookie'

const AUTH_COOKIE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'authjs.callback-url',
  '__Secure-authjs.callback-url',
  'authjs.csrf-token',
  '__Host-authjs.csrf-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'next-auth.callback-url',
  '__Secure-next-auth.callback-url',
  'next-auth.csrf-token',
  '__Host-next-auth.csrf-token',
  STRAPI_SESSION_COOKIE,
]

function isAuthCookieName(name: string) {
  if (AUTH_COOKIE_NAMES.includes(name)) return true

  return AUTH_COOKIE_NAMES.some((baseName) => name.startsWith(`${baseName}.`))
}

function buildExpireOptions(name: string) {
  return {
    name,
    value: '',
    path: '/',
    maxAge: 0,
    secure: name.startsWith('__Secure-') || name.startsWith('__Host-'),
  }
}

function getCookieDomains(hostname: string) {
  if (!hostname || hostname === 'localhost' || !hostname.includes('.')) {
    return [] as string[]
  }

  const domains = new Set<string>([hostname])
  if (hostname.startsWith('www.')) {
    domains.add(hostname.slice(4))
  }

  return [...domains]
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true })
  const authCookies = request.cookies
    .getAll()
    .map((cookie) => cookie.name)
    .filter(isAuthCookieName)
  const cookieDomains = getCookieDomains(request.nextUrl.hostname)

  for (const name of authCookies) {
    response.cookies.set(buildExpireOptions(name))

    for (const domain of cookieDomains) {
      response.cookies.set({
        ...buildExpireOptions(name),
        domain,
      })
    }
  }

  return response
}
