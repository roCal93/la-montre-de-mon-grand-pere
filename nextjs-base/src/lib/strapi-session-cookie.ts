import { cookies } from 'next/headers'

export const STRAPI_SESSION_COOKIE = 'strapi_session_jwt'

export function getStrapiSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  }
}

export async function getStrapiSessionJwt(): Promise<string | null> {
  const cookieJwt = (await cookies()).get(STRAPI_SESSION_COOKIE)?.value ?? null
  if (cookieJwt) {
    return cookieJwt
  }

  const { auth } = await import('@/auth')
  const session = await auth()
  return session?.user?.strapiJwt ?? null
}
