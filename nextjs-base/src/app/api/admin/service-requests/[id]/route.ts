import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentStrapiUser } from '@/lib/strapi-session-cookie'
import { isAdminUser } from '@/lib/is-admin-user'
import { isEmailConfigured, sendEmail } from '@/lib/email-client'

const updateSchema = z.object({
  status: z.enum([
    'pending',
    'in_progress',
    'quote_sent',
    'accepted',
    'completed',
    'cancelled',
  ]),
  admin_response: z.string().max(4000).optional(),
})

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  in_progress: 'En cours de traitement',
  quote_sent: 'Devis envoyé',
  accepted: 'Acceptée',
  completed: 'Terminée',
  cancelled: 'Annulée',
}

const TYPE_LABELS: Record<string, string> = {
  retour_garantie: 'Retour sous garantie',
  reparation: 'Réparation',
  nettoyage: 'Nettoyage',
  autre: 'Autre',
}

function toJsonHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

function escapeHtml(input: string) {
  return input.replace(/[&<>"'/]/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
      '/': '&#x2F;',
    }

    return map[char] ?? char
  })
}

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  return (await res.json().catch(() => null)) as T | null
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const strapiUser = await getCurrentStrapiUser()

  if (!strapiUser) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  if (!isAdminUser(strapiUser)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL
  const apiToken =
    process.env.STRAPI_WRITE_API_TOKEN || process.env.STRAPI_API_TOKEN

  if (!strapiUrl || !apiToken) {
    return NextResponse.json(
      { error: 'Configuration serveur manquante' },
      { status: 500 }
    )
  }

  const getRes = await fetch(
    `${strapiUrl}/api/service-requests/${id}?populate[customer][fields][0]=email&populate[watch_file][fields][0]=reference`,
    {
      headers: { Authorization: `Bearer ${apiToken}` },
      cache: 'no-store',
    }
  )

  if (!getRes.ok) {
    return NextResponse.json(
      { error: 'Demande introuvable' },
      { status: getRes.status === 404 ? 404 : 500 }
    )
  }

  const existing = (
    await parseJsonSafe<{
      data?: {
        documentId: string
        type?: string
        customer?: { email?: string }
        watch_file?: { reference?: string }
      }
    }>(getRes)
  )?.data

  if (!existing?.documentId) {
    return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  }

  const normalizedResponse = parsed.data.admin_response?.trim() ?? ''

  const updateRes = await fetch(`${strapiUrl}/api/service-requests/${id}`, {
    method: 'PUT',
    headers: toJsonHeaders(apiToken),
    body: JSON.stringify({
      data: {
        status: parsed.data.status,
        admin_response:
          normalizedResponse.length > 0 ? normalizedResponse : null,
      },
    }),
  })

  if (!updateRes.ok) {
    const json = await parseJsonSafe<{ error?: { message?: string } }>(
      updateRes
    )
    return NextResponse.json(
      { error: json?.error?.message ?? 'Erreur Strapi' },
      { status: 500 }
    )
  }

  let emailSent = false
  const customerEmail = existing.customer?.email?.trim()

  if (customerEmail && isEmailConfigured()) {
    const safeStatus = escapeHtml(
      STATUS_LABELS[parsed.data.status] ?? parsed.data.status
    )
    const safeType = escapeHtml(
      TYPE_LABELS[existing.type ?? ''] ?? existing.type ?? ''
    )
    const safeReference = escapeHtml(existing.watch_file?.reference ?? 'N/A')
    const safeResponse = escapeHtml(
      normalizedResponse || 'Aucun message complémentaire.'
    ).replace(/\n/g, '<br>')
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')

    await sendEmail({
      to: customerEmail,
      subject: `[Atelier] Mise à jour de votre demande de service`,
      html: `
        <p>Bonjour,</p>
        <p>Votre demande de service a été mise à jour.</p>
        <p>Type : <strong>${safeType}</strong></p>
        <p>Référence montre : <strong>${safeReference}</strong></p>
        <p>Nouveau statut : <strong>${safeStatus}</strong></p>
        <p>Message atelier :</p>
        <blockquote>${safeResponse}</blockquote>
        ${baseUrl ? `<p><a href="${baseUrl}/fr/espace-client/demandes-de-service">Voir mes demandes de service</a></p>` : ''}
      `,
    })
      .then(() => {
        emailSent = true
      })
      .catch((error) => {
        console.error('[service-request-admin] email send failed', error)
      })
  }

  return NextResponse.json({ ok: true, emailSent })
}
