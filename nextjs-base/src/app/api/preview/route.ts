import { draftMode } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function getSafeDestination(urlParam: string | null, baseUrl: string): URL {
  const fallback = new URL('/', baseUrl)
  if (!urlParam) return fallback

  // Allow only same-origin absolute URLs, or relative URLs.
  try {
    const parsed = new URL(urlParam)
    if (parsed.origin !== fallback.origin) {
      return fallback
    }
    return parsed
  } catch {
    try {
      if (!urlParam.startsWith('/') || urlParam.startsWith('//')) {
        return fallback
      }
      return new URL(urlParam, baseUrl)
    } catch {
      return fallback
    }
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  const url = searchParams.get('url')
  const status = searchParams.get('status')

  const configuredSecret = process.env.PREVIEW_SECRET
  if (!configuredSecret) {
    return new Response('PREVIEW_SECRET is not configured', { status: 503 })
  }

  // Vérifier le secret
  if (!secret || secret !== configuredSecret) {
    return new Response('Invalid token', { status: 401 })
  }

  // Comportement configurable : soit utiliser Next.js Draft Mode, soit utiliser uniquement le paramètre ?draft=true
  const useDraftMode = process.env.USE_DRAFT_MODE === 'true'

  const dm = await draftMode()

  // Activer ou désactiver le Draft Mode selon le statut
  if (useDraftMode) {
    if (status === 'published') {
      // Désactiver le Draft Mode pour voir la version publiée
      dm.disable()
    } else {
      // Activer le Draft Mode pour voir le draft
      dm.enable()
    }
  }

  // Rediriger vers l'URL fournie par Strapi (sécurisée par secret)
  const baseUrl =
    req.headers.get('origin') ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'
  const destinationUrl = getSafeDestination(url, baseUrl)

  // Ajouter le paramètre ?draft=true pour indiquer aux pages de fetcher le bon statut (fallback si USE_DRAFT_MODE=false)
  if (status !== 'published') {
    destinationUrl.searchParams.set('draft', 'true')
  }

  return NextResponse.redirect(destinationUrl.toString())
}
