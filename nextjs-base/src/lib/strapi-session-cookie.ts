import { cookies } from 'next/headers'
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

export async function getStrapiSessionJwt(): Promise<string | null> {
  return (await cookies()).get(STRAPI_SESSION_COOKIE)?.value ?? null
}

export async function getCurrentStrapiUser(): Promise<StrapiUser | null> {
  const jwt = await getStrapiSessionJwt()
  if (!jwt) return null

  return getStrapiUserFromJwt(jwt)
}
