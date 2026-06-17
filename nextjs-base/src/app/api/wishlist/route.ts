import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getStrapiSessionJwt } from '@/lib/strapi-session-cookie'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { error: text.slice(0, 500) }
  }
}

async function resolveProductId(
  product: string,
  jwt: string
): Promise<number | null> {
  if (/^\d+$/.test(product)) {
    return Number(product)
  }

  if (!STRAPI_URL) return null

  const url = new URL(`${STRAPI_URL}/api/products`)
  url.searchParams.set('filters[documentId][$eq]', product)
  url.searchParams.set('fields[0]', 'id')
  url.searchParams.set('pagination[pageSize]', '1')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: 'no-store',
  })

  if (!res.ok) return null

  const json = (await parseJsonSafe(res)) as { data?: Array<{ id?: number }> }
  const id = json?.data?.[0]?.id
  return typeof id === 'number' ? id : null
}

async function getStrapiJwt(): Promise<string | null> {
  const session = await auth()
  if (!session) return null
  return getStrapiSessionJwt()
}

/** GET /api/wishlist — list all wishlist items for the current user */
export async function GET() {
  if (!STRAPI_URL) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_STRAPI_URL manquant' },
      { status: 500 }
    )
  }

  const jwt = await getStrapiJwt()
  if (!jwt)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const res = await fetch(
    `${STRAPI_URL}/api/wishlist-items?populate[product][populate]=images`,
    { headers: { Authorization: `Bearer ${jwt}` }, cache: 'no-store' }
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

  const jwt = await getStrapiJwt()
  if (!jwt)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = (await req.json().catch(() => null)) as {
    product?: string
  } | null
  if (!body?.product) {
    return NextResponse.json({ error: 'product requis' }, { status: 400 })
  }

  const normalizedProductId = await resolveProductId(String(body.product), jwt)
  if (!normalizedProductId) {
    return NextResponse.json(
      { error: 'Produit introuvable pour ajout aux favoris' },
      { status: 404 }
    )
  }

  const res = await fetch(`${STRAPI_URL}/api/wishlist-items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ data: { product: normalizedProductId } }),
  })

  const json = await parseJsonSafe(res)
  return NextResponse.json(json, { status: res.ok ? 201 : res.status })
}
