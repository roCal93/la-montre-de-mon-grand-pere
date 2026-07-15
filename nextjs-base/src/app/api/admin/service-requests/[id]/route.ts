import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  getCurrentStrapiUser,
  getStrapiSessionJwt,
} from '@/lib/strapi-session-cookie'
import { isAdminUser } from '@/lib/is-admin-user'
import {
  getEmailConfigurationStatus,
  isEmailConfigured,
  sendEmail,
} from '@/lib/email-client'

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
  quote_sent: 'Devis envoye',
  accepted: 'Acceptee',
  completed: 'Terminee',
  cancelled: 'Annulee',
}

const TYPE_LABELS: Record<string, string> = {
  retour_garantie: 'Retour sous garantie',
  reparation: 'Reparation',
  nettoyage: 'Nettoyage',
  autre: 'Autre',
}

async function buildStrapiAuthHeaders(): Promise<Record<
  string,
  string
> | null> {
  const strapiJwt = await getStrapiSessionJwt()
  if (strapiJwt) {
    return { Authorization: `Bearer ${strapiJwt}` }
  }

  const apiToken =
    process.env.STRAPI_WRITE_API_TOKEN || process.env.STRAPI_API_TOKEN
  if (apiToken) {
    return { Authorization: `Bearer ${apiToken}` }
  }

  return null
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

function extractStrapiError(
  payload: { error?: { message?: string } | string } | null,
  fallback: string
) {
  if (typeof payload?.error === 'string') return payload.error
  if (payload?.error && typeof payload.error === 'object') {
    return payload.error.message ?? fallback
  }
  return fallback
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const strapiUser = await getCurrentStrapiUser()

  if (!strapiUser) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
  }

  if (!isAdminUser(strapiUser)) {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Donnees invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL
  const apiToken =
    process.env.STRAPI_WRITE_API_TOKEN || process.env.STRAPI_API_TOKEN
  const authHeaders = await buildStrapiAuthHeaders()

  if (!strapiUrl || !authHeaders) {
    return NextResponse.json(
      { error: 'Configuration serveur manquante' },
      { status: 500 }
    )
  }

  const getRes = await fetch(
    `${strapiUrl}/api/service-requests/${id}?populate[customer][fields][0]=email&populate[watch_file][fields][0]=reference`,
    {
      headers: authHeaders,
      cache: 'no-store',
    }
  )

  if (!getRes.ok) {
    const json = await parseJsonSafe<{ error?: { message?: string } | string }>(
      getRes
    )
    const error = extractStrapiError(json, 'Demande introuvable')

    return NextResponse.json(
      { error },
      {
        status: [401, 403, 404].includes(getRes.status) ? getRes.status : 500,
      }
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

  let updateRes = await fetch(`${strapiUrl}/api/service-requests/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({
      data: {
        status: parsed.data.status,
        admin_response:
          normalizedResponse.length > 0 ? normalizedResponse : null,
      },
    }),
  })

  // Some Strapi setups keep "update" disabled for Authenticated role.
  // Retry with server API token as a privileged fallback for this admin-only endpoint.
  if (updateRes.status === 403 && apiToken) {
    const usingApiToken = authHeaders.Authorization === `Bearer ${apiToken}`

    if (!usingApiToken) {
      updateRes = await fetch(`${strapiUrl}/api/service-requests/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          data: {
            status: parsed.data.status,
            admin_response:
              normalizedResponse.length > 0 ? normalizedResponse : null,
          },
        }),
      })
    }
  }

  if (!updateRes.ok) {
    const json = await parseJsonSafe<{ error?: { message?: string } | string }>(
      updateRes
    )
    const error = extractStrapiError(json, 'Erreur Strapi')

    return NextResponse.json(
      { error },
      {
        status: [401, 403, 404].includes(updateRes.status)
          ? updateRes.status
          : 500,
      }
    )
  }

  const emailNotification: {
    sent: boolean
    reason: 'sent' | 'missing_customer_email' | 'email_not_configured' | 'send_failed'
  } = {
    sent: false,
    reason: 'missing_customer_email',
  }

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
      normalizedResponse || 'Aucun message complementaire.'
    ).replace(/\n/g, '<br>')
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')

    await sendEmail({
      to: customerEmail,
      subject: '[Atelier] Mise a jour de votre demande de service',
      html: `
        <p>Bonjour,</p>
        <p>Votre demande de service a ete mise a jour.</p>
        <p>Type : <strong>${safeType}</strong></p>
        <p>Reference montre : <strong>${safeReference}</strong></p>
        <p>Nouveau statut : <strong>${safeStatus}</strong></p>
        <p>Message atelier :</p>
        <blockquote>${safeResponse}</blockquote>
        ${baseUrl ? `<p><a href="${baseUrl}/fr/espace-client/demandes-de-service">Voir mes demandes de service</a></p>` : ''}
      `,
    })
      .then(() => {
        emailNotification.sent = true
        emailNotification.reason = 'sent'
      })
      .catch((error) => {
        emailNotification.sent = false
        emailNotification.reason = 'send_failed'
        console.error('[service-request-admin] email send failed', error)
      })
  } else if (customerEmail) {
    emailNotification.sent = false
    emailNotification.reason = 'email_not_configured'
    console.warn(
      '[service-request-admin] email skipped: provider not configured',
      getEmailConfigurationStatus()
    )
  }

  return NextResponse.json({ ok: true, emailNotification })
}
