/**
 * Strapi client authenticated with the current user's JWT (server-side only).
 * The Strapi JWT is stored inside the Auth.js session cookie (httpOnly).
 * It is NEVER exposed to the browser.
 */

import { auth } from '@/auth'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL

type FetchOptions = {
  method?: string
  body?: unknown
  next?: { revalidate?: number }
}

async function getStrapiJwt(): Promise<string | null> {
  const session = await auth()
  return session?.user?.strapiJwt ?? null
}

export async function strapiAuthFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  if (!STRAPI_URL) throw new Error('NEXT_PUBLIC_STRAPI_URL manquante')

  const jwt = await getStrapiJwt()
  if (!jwt) return { data: null, error: 'Non authentifié', status: 401 }

  const { method = 'GET', body, next } = options

  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...(next ? { next } : {}),
  })

  const text = await res.text()
  let parsed: T | null = null
  try {
    parsed = JSON.parse(text) as T
  } catch {
    // non-JSON response (e.g. 204 No Content)
  }

  if (!res.ok) {
    const errMsg =
      (parsed as Record<string, unknown> | null)?.error?.toString() ??
      `Erreur Strapi ${res.status}`
    return { data: null, error: errMsg, status: res.status }
  }

  return { data: parsed, error: null, status: res.status }
}

/** Convenience: GET */
export async function strapiAuthGet<T = unknown>(path: string, revalidate?: number) {
  return strapiAuthFetch<T>(path, { next: revalidate !== undefined ? { revalidate } : undefined })
}

/** Convenience: POST */
export async function strapiAuthPost<T = unknown>(path: string, data: unknown) {
  return strapiAuthFetch<T>(path, { method: 'POST', body: { data } })
}

/** Convenience: PATCH */
export async function strapiAuthPatch<T = unknown>(path: string, data: unknown) {
  return strapiAuthFetch<T>(path, { method: 'PUT', body: { data } })
}

/** Convenience: DELETE */
export async function strapiAuthDelete<T = unknown>(path: string) {
  return strapiAuthFetch<T>(path, { method: 'DELETE' })
}
