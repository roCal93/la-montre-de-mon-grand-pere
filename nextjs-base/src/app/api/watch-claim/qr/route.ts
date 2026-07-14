import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { getCurrentStrapiUser } from '@/lib/strapi-session-cookie'
import { isAdminUser } from '@/lib/is-admin-user'
import { buildWatchClaimUrl } from '@/lib/watch-claim-url'

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'watch'
}

export async function GET(req: NextRequest) {
  const strapiUser = await getCurrentStrapiUser()
  if (!strapiUser) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  if (!isAdminUser(strapiUser)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const watchFileDocumentId =
    req.nextUrl.searchParams.get('watchFileDocumentId')?.trim() ?? ''
  const locale = req.nextUrl.searchParams.get('locale')?.trim() ?? 'fr'

  if (!watchFileDocumentId) {
    return NextResponse.json(
      { error: 'watchFileDocumentId requis' },
      { status: 400 }
    )
  }

  let claimUrl: string
  try {
    claimUrl = buildWatchClaimUrl(watchFileDocumentId, locale)
  } catch {
    return NextResponse.json(
      { error: 'Configuration serveur manquante pour générer le QR' },
      { status: 500 }
    )
  }

  let pngBuffer: Buffer
  try {
    pngBuffer = await QRCode.toBuffer(claimUrl, {
      type: 'png',
      width: 1024,
      errorCorrectionLevel: 'M',
      margin: 2,
      color: {
        dark: '#111111',
        light: '#FFFFFF',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Erreur lors de la génération du QR' },
      { status: 500 }
    )
  }

  const safeName = sanitizeFileName(watchFileDocumentId)
  return new NextResponse(new Uint8Array(pngBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="qr-claim-${safeName}.png"`,
      'Cache-Control': 'no-store',
    },
  })
}
