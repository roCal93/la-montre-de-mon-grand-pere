import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  getCurrentStrapiUser,
  getStrapiSessionJwt,
} from '@/lib/strapi-session-cookie'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_WRITE_API_TOKEN

async function safeAuth() {
  try {
    return await auth()
  } catch {
    return null
  }
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { error: text.slice(0, 500) }
  }
}

async function buildStrapiHeaders(
  customerId: string
): Promise<Record<string, string> | null> {
  // Prefer Strapi JWT: uses the authenticated user's own token, no API token
  // permission config needed in Strapi admin (Authenticated role is enough).
  const strapiJwt = await getStrapiSessionJwt()
  if (strapiJwt) {
    return { Authorization: `Bearer ${strapiJwt}` }
  }

  // Fallback: server-to-server API token with customer identity header.
  // Requires the API token to have find/create/delete permissions in Strapi admin.
  if (STRAPI_API_TOKEN) {
    return {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      'x-hakuna-customer-id': customerId,
    }
  }

  return null
}

async function resolveCustomerId(): Promise<string | null> {
  const session = await safeAuth()
  if (session?.user?.id) {
    return session.user.id
  }

  const strapiUser = await getCurrentStrapiUser()
  if (strapiUser?.id) {
    return String(strapiUser.id)
  }

  return null
}

async function resolveProductReference(
  product: string | undefined,
  productId: number | undefined
): Promise<string | null> {
  const normalizedProduct = product?.trim()
  if (normalizedProduct) return normalizedProduct

  if (!Number.isFinite(productId) || !STRAPI_URL) return null

  const token = STRAPI_API_TOKEN
  const res = await fetch(
    `${STRAPI_URL}/api/products/${productId}?fields[0]=documentId`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    }
  )

  if (!res.ok) return null

  const json = (await parseJsonSafe(res)) as {
    data?: { documentId?: string } | null
  } | null
  const documentId = json?.data?.documentId
  return typeof documentId === 'string' && documentId.trim()
    ? documentId.trim()
    : null
}

async function resolveProductCandidates(
  product: string | undefined,
  productId: number | undefined
): Promise<Array<string | number>> {
  const candidates: Array<string | number> = []
  const pushCandidate = (value: string | number | null | undefined) => {
    if (typeof value === 'string') {
      const normalized = value.trim()
      if (!normalized) return
      if (!candidates.some((item) => String(item) === normalized)) {
        candidates.push(normalized)
      }
      return
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      if (!candidates.some((item) => String(item) === String(value))) {
        candidates.push(value)
      }
    }
  }

  const normalizedProduct = product?.trim()
  pushCandidate(normalizedProduct)
  pushCandidate(productId)

  if (!STRAPI_URL) return candidates

  // If we only have an id, resolve documentId.
  if (
    !normalizedProduct &&
    typeof productId === 'number' &&
    Number.isFinite(productId)
  ) {
    const token = STRAPI_API_TOKEN
    const byIdRes = await fetch(
      `${STRAPI_URL}/api/products/${productId}?fields[0]=documentId`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      }
    ).catch(() => null)

    if (byIdRes?.ok) {
      const byIdJson = (await parseJsonSafe(byIdRes)) as {
        data?: { documentId?: string } | null
      } | null
      pushCandidate(byIdJson?.data?.documentId)
    }
  }

  // If we have a documentId-like value, resolve numeric id.
  if (normalizedProduct && /[^0-9]/.test(normalizedProduct)) {
    const token = STRAPI_API_TOKEN
    const byDocumentIdRes = await fetch(
      `${STRAPI_URL}/api/products?filters[documentId][$eq]=${encodeURIComponent(normalizedProduct)}&pagination[limit]=1&fields[0]=documentId`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      }
    ).catch(() => null)

    if (byDocumentIdRes?.ok) {
      const byDocumentIdJson = (await parseJsonSafe(byDocumentIdRes)) as {
        data?: Array<{ id?: number }>
      } | null
      pushCandidate(byDocumentIdJson?.data?.[0]?.id)
    }
  }

  return candidates
}

/** GET /api/wishlist — list all wishlist items for the current user */
export async function GET() {
  if (!STRAPI_URL) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_STRAPI_URL manquant' },
      { status: 500 }
    )
  }

  const customerId = await resolveCustomerId()
  if (!customerId)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const headers = await buildStrapiHeaders(customerId)
  if (!headers) {
    return NextResponse.json(
      { error: 'STRAPI_WRITE_API_TOKEN manquant' },
      { status: 500 }
    )
  }

  const res = await fetch(
    `${STRAPI_URL}/api/wishlist-items?populate[product][populate]=images`,
    {
      headers,
      cache: 'no-store',
    }
  )

  const json = await parseJsonSafe(res)
  return NextResponse.json(json, { status: res.ok ? 200 : res.status })
}

/** POST /api/wishlist — add a product to wishlist */
export async function POST(req: NextRequest) {
  if (!STRAPI_URL) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_STRAPI_URL manquant' },
      { status: 500 }
    )
  }

  const customerId = await resolveCustomerId()
  if (!customerId)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const headers = await buildStrapiHeaders(customerId)
  if (!headers) {
    return NextResponse.json(
      { error: 'STRAPI_WRITE_API_TOKEN manquant' },
      { status: 500 }
    )
  }

  const body = (await req.json().catch(() => null)) as {
    product?: string
    productId?: number
  } | null

  const productRef = await resolveProductReference(
    body?.product,
    body?.productId
  )
  const productCandidates = await resolveProductCandidates(
    productRef ?? body?.product,
    body?.productId
  )
  if (productCandidates.length === 0) {
    return NextResponse.json({ error: 'product requis' }, { status: 400 })
  }

  let lastStatus = 400
  let lastPayload: unknown = { error: 'product requis' }

  for (const candidate of productCandidates) {
    const res = await fetch(`${STRAPI_URL}/api/wishlist-items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ data: { product: candidate } }),
    })

    const json = await parseJsonSafe(res)
    if (res.ok) {
      return NextResponse.json(json, { status: 201 })
    }

    // Keep trying if it's a product-reference validation issue.
    if (res.status !== 400) {
      return NextResponse.json(json, { status: res.status })
    }

    lastStatus = res.status
    lastPayload = json
  }

  return NextResponse.json(lastPayload, { status: lastStatus })
}
