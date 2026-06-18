import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_API_TOKEN = process.env.STRAPI_WRITE_API_TOKEN

/** DELETE /api/wishlist/[id] — remove a wishlist item */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { id } = await params

  // Ownership check is enforced server-side inside the custom Strapi delete controller.
  // A direct DELETE is sufficient; no pre-GET needed (that route is not publicly accessible).
  const res = await fetch(`${STRAPI_URL}/api/wishlist-items/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      'x-hakuna-customer-id': session.user.id,
    },
  })

  if (!res.ok) {
    const status = res.status === 403 ? 403 : res.status === 404 ? 404 : 500
    return NextResponse.json({ error: 'Suppression échouée' }, { status })
  }

  return new NextResponse(null, { status: 204 })
}
