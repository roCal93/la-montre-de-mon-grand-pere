import { createWatchClaimCode } from '@/lib/watch-claim-code'

function getClaimBaseUrl() {
  const configuredBaseUrl =
    process.env.CLAIM_QR_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim()

  if (!configuredBaseUrl) {
    throw new Error('CLAIM_QR_BASE_URL ou NEXT_PUBLIC_SITE_URL manquant')
  }

  return configuredBaseUrl.replace(/\/$/, '')
}

export function buildWatchClaimUrl(watchFileDocumentId: string, locale = 'fr') {
  const code = createWatchClaimCode(watchFileDocumentId)
  const baseUrl = getClaimBaseUrl()
  void locale

  return `${baseUrl}/activation?code=${encodeURIComponent(code)}`
}
