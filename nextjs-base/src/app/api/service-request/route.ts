import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import {
  getCurrentStrapiUser,
  getStrapiSessionJwt,
} from '@/lib/strapi-session-cookie'

const serviceRequestSchema = z.object({
  type: z.enum(['retour_garantie', 'reparation', 'nettoyage', 'autre']),
  watch_file_document_id: z.string().min(1),
  description: z.string().min(10).max(2000),
})

const TYPE_LABELS: Record<string, string> = {
  retour_garantie: 'Retour sous garantie',
  reparation: 'Réparation',
  nettoyage: 'Nettoyage',
  autre: 'Autre',
}

function buildWatchLabel(watchFile: {
  reference?: string
  product?: { name?: string } | null
}) {
  const productName = watchFile.product?.name?.trim()
  const reference = watchFile.reference?.trim()

  if (productName && reference) return `${productName} - ${reference}`
  if (productName) return productName
  if (reference) return `Dossier ${reference}`

  return ''
}

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
  if (!strapiUrl) {
    return NextResponse.json(
      { error: 'Configuration Strapi manquante' },
      { status: 500 }
    )
  }

  // Verify the watch-file belongs to the authenticated user (IDOR prevention)
  const wfRes = await fetch(
    `${strapiUrl}/api/watch-files/${parsed.data.watch_file_document_id}?populate[customer]=true&populate[product][fields][0]=name&fields[0]=reference`,
    { headers: { Authorization: `Bearer ${strapiJwt}` } }
  )
  if (!wfRes.ok) {
    return NextResponse.json(
      { error: 'Dossier montre introuvable' },
      { status: 404 }
    )
  }
  const wfJson = (await wfRes.json()) as {
    data?: {
      reference?: string
      product?: { name?: string } | null
    }
  }
  const watchTitle = buildWatchLabel(wfJson.data ?? {})

  const primaryRes = await fetch(`${strapiUrl}/api/service-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${strapiJwt}`,
    },
    body: JSON.stringify({
      data: {
        type: parsed.data.type,
        description: parsed.data.description,
        watch_description: watchTitle || null,
        watch_file: {
          connect: [{ documentId: parsed.data.watch_file_document_id }],
        },
      },
    }),
  })

  let res = primaryRes

  // Fallback: in some environments, Authenticated role may not have create permission
  // on service-requests. Retry with server token while preserving customer identity.
  if (res.status === 401 || res.status === 403) {
    const writeToken =
      process.env.STRAPI_WRITE_API_TOKEN || process.env.STRAPI_API_TOKEN
    const strapiUser = await getCurrentStrapiUser()

    if (writeToken && strapiUser?.id) {
      res = await fetch(`${strapiUrl}/api/service-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${writeToken}`,
          'x-hakuna-customer-id': String(strapiUser.id),
        },
        body: JSON.stringify({
          data: {
            type: parsed.data.type,
            description: parsed.data.description,
            watch_description: watchTitle || null,
            watch_file: {
              connect: [{ documentId: parsed.data.watch_file_document_id }],
            },
          },
        }),
      })
    }
  }

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as {
      error?: { message?: string } | string
    } | null

    const errorMsg =
      typeof json?.error === 'string'
        ? json.error
        : (json?.error?.message ?? 'Erreur Strapi')

    const status = res.status >= 400 && res.status < 600 ? res.status : 500

    return NextResponse.json({ error: errorMsg }, { status })
  }

  const json = await res.json()

  const esc = (s: string) =>
    s.replace(
      /[&<>"'/]/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;',
          '/': '&#x2F;',
        })[c] ?? c
    )
  const safeType = esc(TYPE_LABELS[parsed.data.type] ?? parsed.data.type)
  const safeName = esc(session.user.name ?? '')
  const safeEmail = esc(session.user.email ?? '')
  const safeWatch = esc(watchTitle)
  const safeDesc = esc(parsed.data.description).replace(/\n/g, '<br>')

  // Notify admin via email
  const adminEmail = process.env.CONTACT_EMAIL
  const emailNotification: {
    sent: boolean
    reason:
      'sent' | 'missing_contact_email' | 'email_not_configured' | 'send_failed'
  } = {
    sent: false,
    reason: 'missing_contact_email',
  }

  if (adminEmail) {
    const { sendEmail, isEmailConfigured, getEmailConfigurationStatus } =
      await import('@/lib/email-client')
    if (isEmailConfigured()) {
      await sendEmail({
        to: adminEmail,
        subject: `[Demande de service] ${parsed.data.type} — ${session.user.email}`,
        html: `
          <p><strong>Nouvelle demande de service</strong></p>
          <p>Type : <strong>${safeType}</strong></p>
          <p>Client : ${safeName} (${safeEmail})</p>
          <p>Montre : ${safeWatch}</p>
          <p>Description :</p>
          <blockquote>${safeDesc}</blockquote>
          <p><a href="${process.env.NEXT_PUBLIC_STRAPI_URL}/admin">Voir dans l'admin Strapi</a></p>
        `,
      })
        .then(() => {
          emailNotification.sent = true
          emailNotification.reason = 'sent'
        })
        .catch((error) => {
          emailNotification.sent = false
          emailNotification.reason = 'send_failed'
          console.error('[service-request] admin email send failed', error)
        })
    } else {
      emailNotification.sent = false
      emailNotification.reason = 'email_not_configured'
      console.warn(
        '[service-request] admin email skipped: provider not configured',
        getEmailConfigurationStatus()
      )
    }
  } else {
    console.warn('[service-request] admin email skipped: CONTACT_EMAIL missing')
  }

  const clientEmailNotification: {
    sent: boolean
    reason:
      'sent' | 'missing_client_email' | 'email_not_configured' | 'send_failed'
  } = {
    sent: false,
    reason: 'missing_client_email',
  }

  const clientEmail = session.user.email?.trim()

  if (clientEmail) {
    const { sendEmail, isEmailConfigured, getEmailConfigurationStatus } =
      await import('@/lib/email-client')

    if (isEmailConfigured()) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
      const clientFirstName = safeName || 'Bonjour'

      await sendEmail({
        to: clientEmail,
        subject: 'Votre demande de service a bien été reçue',
        html: `
          <p>Bonjour ${clientFirstName},</p>
          <p>Nous confirmons la bonne réception de votre demande de service.</p>
          <p>Type : <strong>${safeType}</strong></p>
          <p>Montre : <strong>${safeWatch || 'Votre montre'}</strong></p>
          <p>Description :</p>
          <blockquote>${safeDesc}</blockquote>
          <p>Notre atelier reviendra vers vous dès qu'une mise à jour sera disponible.</p>
          ${siteUrl ? `<p><a href="${siteUrl}/fr/espace-client/demandes-de-service">Suivre ma demande</a></p>` : ''}
        `,
      })
        .then(() => {
          clientEmailNotification.sent = true
          clientEmailNotification.reason = 'sent'
        })
        .catch((error) => {
          clientEmailNotification.sent = false
          clientEmailNotification.reason = 'send_failed'
          console.error('[service-request] client email send failed', error)
        })
    } else {
      clientEmailNotification.sent = false
      clientEmailNotification.reason = 'email_not_configured'
      console.warn(
        '[service-request] client email skipped: provider not configured',
        getEmailConfigurationStatus()
      )
    }
  }

  return NextResponse.json(
    {
      ...json,
      emailNotification,
      clientEmailNotification,
    },
    { status: 201 }
  )
}
