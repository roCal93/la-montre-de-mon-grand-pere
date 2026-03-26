import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL

/** DELETE /api/wishlist/[id] — remove a wishlist item */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.strapiJwt) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { id } = await params

  const res = await fetch(`${STRAPI_URL}/api/wishlist-items/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${session.user.strapiJwt}` },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Suppression échouée' }, { status: res.status })
  }

  return new NextResponse(null, { status: 204 })
}
