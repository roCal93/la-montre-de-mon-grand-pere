'use server'

import { cookies } from 'next/headers'
import { signOut } from '@/auth'
import { STRAPI_SESSION_COOKIE } from '@/lib/strapi-session-cookie'

export async function logoutAction(locale: string) {
  const cookieStore = await cookies()
  cookieStore.delete(STRAPI_SESSION_COOKIE)
  await signOut({ redirectTo: `/${locale}` })
}
