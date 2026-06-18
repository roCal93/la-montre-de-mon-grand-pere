import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  getCurrentStrapiUser,
  getStrapiSessionJwt,
} from '@/lib/strapi-session-cookie'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_WRITE_API_TOKEN

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
  const strapiJwt = await getStrapiSessionJwt()
  if (strapiJwt) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${strapiJwt}`,
    }
    return headers
  }

  if (STRAPI_API_TOKEN) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      'x-hakuna-customer-id': customerId,
    }
    return headers
  }

  return null
}

async function resolveCustomerId(): Promise<string | null> {
  const session = await auth()
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
  if (!productRef) {
    return NextResponse.json({ error: 'product requis' }, { status: 400 })
  }

  const res = await fetch(`${STRAPI_URL}/api/wishlist-items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ data: { product: productRef } }),
  })

  const json = await parseJsonSafe(res)
  return NextResponse.json(json, { status: res.ok ? 201 : res.status })
}
