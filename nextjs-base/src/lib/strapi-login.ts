const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL

export type StrapiUser = {
  id: number
  email: string
  username: string
}

type StrapiAuthResult = {
  jwt: string
  user: StrapiUser
}

export async function getStrapiUserFromJwt(jwt: string) {
  if (!STRAPI_URL) throw new Error('NEXT_PUBLIC_STRAPI_URL manquante')

  const res = await fetch(`${STRAPI_URL}/api/users/me`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    cache: 'no-store',
  })

  if (!res.ok) return null

  return (await res.json()) as StrapiUser
}

export async function authenticateStrapiUser(email: string, password: string) {
  if (!STRAPI_URL) throw new Error('NEXT_PUBLIC_STRAPI_URL manquante')

  const res = await fetch(`${STRAPI_URL}/api/auth/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password }),
  })

  if (!res.ok) return null

  return (await res.json()) as StrapiAuthResult
}
