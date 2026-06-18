import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { error: text.slice(0, 500) }
  }
}

/** GET /api/wishlist — list all wishlist items for the current user */
export async function GET() {
  if (!STRAPI_URL) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_STRAPI_URL manquant' },
      { status: 500 }
    )
  }

  const session = await auth()
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const res = await fetch(
    `${STRAPI_URL}/api/wishlist-items?populate[product][populate]=images`,
    {
      headers: {
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        'x-hakuna-customer-id': session.user.id,
      },
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

  const session = await auth()
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = (await req.json().catch(() => null)) as {
    product?: string
  } | null
  if (!body?.product) {
    return NextResponse.json({ error: 'product requis' }, { status: 400 })
  }

  const res = await fetch(`${STRAPI_URL}/api/wishlist-items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      'x-hakuna-customer-id': session.user.id,
    },
    body: JSON.stringify({ data: { product: body.product } }),
  })

  const json = await parseJsonSafe(res)
  return NextResponse.json(json, { status: res.ok ? 201 : res.status })
}
