import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { getStrapiSessionJwt } from '@/lib/strapi-session-cookie'

const serviceRequestSchema = z.object({
  type: z.enum(['retour_garantie', 'reparation', 'nettoyage', 'autre']),
  watch_file_document_id: z.string().min(1),
  description: z.string().min(10).max(2000),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  const strapiJwt = await getStrapiSessionJwt()
  if (!session || !strapiJwt) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = serviceRequestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL

  // Verify the watch-file belongs to the authenticated user (IDOR prevention)
  const wfRes = await fetch(
    `${strapiUrl}/api/watch-files/${parsed.data.watch_file_document_id}?populate[customer]=true`,
    { headers: { Authorization: `Bearer ${strapiJwt}` } }
  )
  if (!wfRes.ok) {
    return NextResponse.json(
      { error: 'Dossier montre introuvable' },
      { status: 404 }
    )
  }
  const wfJson = (await wfRes.json()) as { data: { title?: string } }
  const watchTitle = wfJson.data?.title ?? ''

  const res = await fetch(`${strapiUrl}/api/service-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${strapiJwt}`,
    },
    body: JSON.stringify({
      data: {
        type: parsed.data.type,
        description: parsed.data.description,
        watch_file: {
          connect: [{ documentId: parsed.data.watch_file_document_id }],
        },
      },
    }),
  })

  if (!res.ok) {
    const json = (await res.json()) as { error?: { message?: string } }
    return NextResponse.json(
      { error: json?.error?.message ?? 'Erreur Strapi' },
      { status: 500 }
    )
  }

  const json = await res.json()

  // Notify admin via email
  const adminEmail = process.env.CONTACT_EMAIL
  if (adminEmail) {
    const { sendEmail, isEmailConfigured } = await import('@/lib/email-client')
    if (isEmailConfigured()) {
      await sendEmail({
        to: adminEmail,
        subject: `[Demande de service] ${parsed.data.type} — ${session.user.email}`,
        html: `
          <p><strong>Nouvelle demande de service</strong></p>
          <p>Type : <strong>${parsed.data.type}</strong></p>
          <p>Client : ${session.user.name} (${session.user.email})</p>
          <p>Montre : ${watchTitle}</p>
          <p>Description :</p>
          <blockquote>${parsed.data.description.replace(/\n/g, '<br>')}</blockquote>
          <p><a href="${process.env.NEXT_PUBLIC_STRAPI_URL}/admin">Voir dans l'admin Strapi</a></p>
        `,
      }).catch(() => {})
    }
  }

  return NextResponse.json(json, { status: 201 })
}
