import { NextRequest, NextResponse } from 'next/server'
import { getCurrentStrapiUser } from '@/lib/strapi-session-cookie'
import { isAdminUser } from '@/lib/is-admin-user'
import { verifyWatchClaimCode } from '@/lib/watch-claim-code'
import { verifyWatchClaimToken } from '@/lib/watch-claim-token'

function toJsonHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

function mapClaimError(reason: string) {
  switch (reason) {
    case 'expired':
      return { status: 410, message: 'Le QR code a expiré.' }
    case 'invalid_signature':
    case 'invalid_format':
    case 'invalid_payload':
      return { status: 400, message: 'QR code invalide.' }
    default:
      return { status: 400, message: 'QR code invalide.' }
  }
}

export async function POST(req: NextRequest) {
  const strapiUser = await getCurrentStrapiUser()
  if (!strapiUser) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  if (isAdminUser(strapiUser)) {
    return NextResponse.json(
      {
        error:
          'Compte admin détecté. Le claim doit être fait avec le compte client final.',
        code: 'admin_not_allowed',
      },
      { status: 403 }
    )
  }

  const body = (await req.json().catch(() => null)) as {
    token?: string
    code?: string
  } | null
  const token = body?.token?.trim()
  const code = body?.code?.trim()

  let watchFileDocumentId: string | null = null

  if (token) {
    let verified
    try {
      verified = verifyWatchClaimToken(token)
    } catch {
      return NextResponse.json(
        { error: 'Configuration claim indisponible' },
        { status: 503 }
      )
    }

    if (!verified.ok) {
      const mapped = mapClaimError(verified.reason)
      return NextResponse.json(
        { error: mapped.message, code: verified.reason },
        { status: mapped.status }
      )
    }

    watchFileDocumentId = verified.watchFileDocumentId
  } else if (code) {
    try {
      const verifiedCode = verifyWatchClaimCode(code)
      if (!verifiedCode.ok || !verifiedCode.watchFileDocumentId) {
        return NextResponse.json(
          { error: 'Code d activation invalide.', code: 'invalid_code' },
          { status: 400 }
        )
      }
      watchFileDocumentId = verifiedCode.watchFileDocumentId
    } catch {
      return NextResponse.json(
        { error: 'Configuration claim indisponible' },
        { status: 503 }
      )
    }
  } else {
    return NextResponse.json({ error: 'token ou code requis' }, { status: 400 })
  }

  if (!watchFileDocumentId) {
    return NextResponse.json(
      { error: 'Code d activation invalide.', code: 'invalid_code' },
      { status: 400 }
    )
  }

  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL
  const apiToken =
    process.env.STRAPI_WRITE_API_TOKEN || process.env.STRAPI_API_TOKEN
  const assignSecret = process.env.CLAIM_ASSIGN_SECRET

  if (!strapiUrl || !apiToken || !assignSecret) {
    return NextResponse.json(
      { error: 'Configuration serveur manquante' },
      { status: 500 }
    )
  }

  const response = await fetch(`${strapiUrl}/api/watch-files/assign-customer`, {
    method: 'POST',
    headers: {
      ...toJsonHeaders(apiToken),
      'x-claim-assign-secret': assignSecret,
    },
    body: JSON.stringify({
      watchFileDocumentId,
      customerId: strapiUser.id,
      force: false,
    }),
    cache: 'no-store',
  }).catch(() => null)

  if (!response) {
    return NextResponse.json({ error: 'Strapi indisponible' }, { status: 503 })
  }

  const json = (await response.json().catch(() => null)) as {
    success?: boolean
    reason?: string
    watchFileDocumentId?: string
  } | null

  if (!response.ok) {
    if (response.status === 403) {
      return NextResponse.json(
        {
          error:
            'Accès Strapi refusé. Vérifiez STRAPI_WRITE_API_TOKEN et les droits de ce token.',
          code: 'strapi_forbidden',
        },
        { status: 403 }
      )
    }

    if (response.status === 401) {
      return NextResponse.json(
        {
          error:
            'Authentification Strapi invalide. Vérifiez STRAPI_WRITE_API_TOKEN et CLAIM_ASSIGN_SECRET.',
          code: 'strapi_unauthorized',
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur Strapi' },
      { status: response.status }
    )
  }

  if (!json?.success) {
    if (json?.reason === 'already_assigned') {
      return NextResponse.json(
        {
          error: 'Cette montre est déjà associée à un autre compte.',
          code: 'already_assigned',
        },
        { status: 409 }
      )
    }

    if (json?.reason === 'watch_file_not_found') {
      return NextResponse.json(
        {
          error: 'Dossier montre introuvable.',
          code: 'watch_file_not_found',
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error: 'Association impossible pour le moment.',
        code: json?.reason ?? 'claim_failed',
      },
      { status: 409 }
    )
  }

  return NextResponse.json({
    success: true,
    watchFileDocumentId: json.watchFileDocumentId ?? watchFileDocumentId,
  })
}
