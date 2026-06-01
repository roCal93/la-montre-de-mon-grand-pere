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

function supportsDomainAttribute(name: string) {
  return !name.startsWith('__Host-')
}

function getCookieDomains(hostname: string) {
  // For www. subdomains, Auth.js sets cookies without a domain attribute
  // (scoped to the exact www. host). A domain-scoped deletion would target a
  // different cookie and — worse — would overwrite the correct no-domain
  // deletion in the Set-Cookie response (NextResponse deduplicates by name).
  if (
    !hostname ||
    hostname === 'localhost' ||
    !hostname.includes('.') ||
    hostname.startsWith('www.')
  ) {
    return [] as string[]
  }

  return [hostname]
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true })
  const authCookieNames = request.cookies
    .getAll()
    .map((cookie) => cookie.name)
    .filter(isAuthCookieName)
  const cookieDomains = getCookieDomains(request.nextUrl.hostname)

  if (authCookieNames.length === 0) {
    return response
  }

  for (const name of authCookieNames) {
    response.cookies.set(buildExpireOptions(name))

    if (!supportsDomainAttribute(name)) {
      continue
    }

    for (const domain of cookieDomains) {
      response.cookies.set({
        ...buildExpireOptions(name),
        domain,
      })
    }
  }

  return response
}
