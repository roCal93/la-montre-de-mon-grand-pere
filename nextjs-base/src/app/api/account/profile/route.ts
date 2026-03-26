import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  username: z.string().min(2),
  email: z.string().email(),
})

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.strapiJwt) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL
  const res = await fetch(`${strapiUrl}/api/users/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.user.strapiJwt}`,
    },
    body: JSON.stringify(parsed.data),
  })

  const json = await res.json()

  if (!res.ok) {
    const msg = (json as { error?: { message?: string } })?.error?.message ?? 'Erreur Strapi'
    return NextResponse.json({ error: msg }, { status: res.status })
  }

  return NextResponse.json({ ok: true })
}
