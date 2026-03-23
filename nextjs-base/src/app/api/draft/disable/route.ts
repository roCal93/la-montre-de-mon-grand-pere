import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

function getSafeReturnUrl(returnUrl: string | null, origin: string): string {
  if (!returnUrl) return '/'

  try {
    const parsed = new URL(returnUrl)
    if (parsed.origin !== origin) {
      return '/'
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    if (!returnUrl.startsWith('/') || returnUrl.startsWith('//')) {
      return '/'
    }
    return returnUrl
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const configuredSecret = process.env.PREVIEW_SECRET
  if (!configuredSecret) {
    return new Response('PREVIEW_SECRET is not configured', { status: 503 })
  }

  const secret =
    searchParams.get('secret') ||
    request.headers.get('x-preview-secret') ||
    request.headers.get('x-webhook-secret')
  if (!secret || secret !== configuredSecret) {
    return new Response('Invalid token', { status: 401 })
  }

  const origin = new URL(request.url).origin
  const returnUrl = getSafeReturnUrl(searchParams.get('returnUrl'), origin)

  // Disable Draft Mode
  const dm = await draftMode()
  dm.disable()

  // Redirect back to the page
  redirect(returnUrl)
}
