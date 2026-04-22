import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getStrapiSessionJwt } from '@/lib/strapi-session-cookie'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL

/** DELETE /api/wishlist/[id] — remove a wishlist item */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const strapiJwt = await getStrapiSessionJwt()
  if (!session || !strapiJwt) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { id } = await params

  const res = await fetch(`${STRAPI_URL}/api/wishlist-items/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${strapiJwt}` },
  })

  if (!res.ok) {
    return NextResponse.json(
      { error: 'Suppression échouée' },
      { status: res.status }
    )
  }

  return new NextResponse(null, { status: 204 })
}
