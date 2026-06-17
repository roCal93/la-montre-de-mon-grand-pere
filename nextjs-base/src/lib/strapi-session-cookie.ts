import { cookies } from 'next/headers'
import { decode } from 'next-auth/jwt'
import { getStrapiUserFromJwt, type StrapiUser } from '@/lib/strapi-login'

export const STRAPI_SESSION_COOKIE = 'strapi_session_jwt'
export const STRAPI_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60

export function getStrapiSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: STRAPI_SESSION_MAX_AGE_SECONDS,
  }
}

/** Read Strapi JWT from the NextAuth httpOnly token cookie as a fallback. */
async function getStrapiJwtFromNextAuthToken(): Promise<string | null> {
  const secret = process.env.AUTH_SECRET
  if (!secret) return null

  const cookieStore = await cookies()
  const tokenValue =
    cookieStore.get('__Secure-authjs.session-token')?.value ??
    cookieStore.get('authjs.session-token')?.value

  if (!tokenValue) return null

  try {
    const decoded = await decode({
      token: tokenValue,
      secret,
      salt: '__Secure-authjs.session-token',
    })
    const jwt = (decoded as Record<string, unknown>)?.strapiJwt
    return typeof jwt === 'string' ? jwt : null
  } catch {
    return null
  }
}

export async function getStrapiSessionJwt(): Promise<string | null> {
  const fromCookie = (await cookies()).get(STRAPI_SESSION_COOKIE)?.value
  if (fromCookie) return fromCookie

  // Fallback: the Strapi JWT is stored inside the NextAuth JWT token (persistent
  // httpOnly cookie) so favorites survive browser restarts without re-login.
  return getStrapiJwtFromNextAuthToken()
}

export async function getCurrentStrapiUser(): Promise<StrapiUser | null> {
  const jwt = await getStrapiSessionJwt()
  if (!jwt) return null

  return getStrapiUserFromJwt(jwt)
}
