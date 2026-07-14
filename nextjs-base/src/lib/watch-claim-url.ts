import { createWatchClaimToken } from '@/lib/watch-claim-token'

function getClaimBaseUrl() {
  const configuredBaseUrl =
    process.env.CLAIM_QR_BASE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim()

  if (!configuredBaseUrl) {
    throw new Error('CLAIM_QR_BASE_URL ou NEXT_PUBLIC_SITE_URL manquant')
  }

  return configuredBaseUrl.replace(/\/$/, '')
}

export function buildWatchClaimUrl(
  watchFileDocumentId: string,
  locale = 'fr'
) {
  const token = createWatchClaimToken(watchFileDocumentId)
  const baseUrl = getClaimBaseUrl()
  const normalizedLocale = locale.trim() || 'fr'

  return `${baseUrl}/${encodeURIComponent(normalizedLocale)}/espace-client/claim?token=${encodeURIComponent(token)}`
}
