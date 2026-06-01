'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { STRAPI_SESSION_COOKIE } from '@/lib/strapi-session-cookie'

// All possible Auth.js v5 cookie names (HTTP dev + HTTPS prod variants)
const AUTH_COOKIE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'authjs.callback-url',
  '__Secure-authjs.callback-url',
  'authjs.csrf-token',
  '__Host-authjs.csrf-token',
]

/**
 * Clears all auth session cookies server-side then redirects to the home page.
 * redirect() in a Server Action sends a proper redirect response to the client,
 * which avoids Next.js trying to re-render the protected page with no cookies (→ 400).
 */
export async function logoutAction(locale: string) {
  const cookieStore = await cookies()
  for (const name of AUTH_COOKIE_NAMES) {
    cookieStore.delete(name)
  }
  cookieStore.delete(STRAPI_SESSION_COOKIE)
  redirect(`/${locale}`)
}
