import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  getCurrentStrapiUser,
  getStrapiSessionJwt,
} from '@/lib/strapi-session-cookie'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_WRITE_API_TOKEN

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

/** DELETE /api/wishlist/[id] — remove a wishlist item */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const customerId = await resolveCustomerId()
  if (!customerId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const headers = await buildStrapiHeaders(customerId)
  if (!headers) {
    return NextResponse.json(
      { error: 'STRAPI_WRITE_API_TOKEN manquant' },
      { status: 500 }
    )
  }

  const { id } = await params

  // Ownership check is enforced server-side inside the custom Strapi delete controller.
  // A direct DELETE is sufficient; no pre-GET needed (that route is not publicly accessible).
  const res = await fetch(`${STRAPI_URL}/api/wishlist-items/${id}`, {
    method: 'DELETE',
    headers,
  })

  if (!res.ok) {
    const status = res.status === 403 ? 403 : res.status === 404 ? 404 : 500
    return NextResponse.json({ error: 'Suppression échouée' }, { status })
  }

  return new NextResponse(null, { status: 204 })
}
