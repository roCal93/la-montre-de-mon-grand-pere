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
    const dataUrl = await QRCode.toDataURL(claimUrl, {
      width: 1024,
      errorCorrectionLevel: 'M',
      margin: 2,
    })

    const base64Payload = dataUrl.split(',')[1]
    if (!base64Payload) {
      throw new Error('invalid_qr_data_url')
    }

    pngBuffer = Buffer.from(base64Payload, 'base64')
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
