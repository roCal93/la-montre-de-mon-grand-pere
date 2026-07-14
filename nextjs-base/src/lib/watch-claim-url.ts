import {
  createWatchClaimCode,
  createWatchClaimShortCode,
} from '@/lib/watch-claim-code'

type WatchClaimTarget =
  | string
  | {
      watchFileDocumentId: string
      watchFileId?: number
    }

function getClaimBaseUrl() {
  const configuredBaseUrl =
    process.env.CLAIM_QR_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim()

  if (!configuredBaseUrl) {
    throw new Error('CLAIM_QR_BASE_URL ou NEXT_PUBLIC_SITE_URL manquant')
  }

  return configuredBaseUrl.replace(/\/$/, '')
}

export function buildWatchClaimUrl(target: WatchClaimTarget, locale = 'fr') {
  const watchFileDocumentId =
    typeof target === 'string' ? target : target.watchFileDocumentId
  const watchFileId =
    typeof target === 'string' ? undefined : target.watchFileId
  const code =
    typeof watchFileId === 'number'
      ? createWatchClaimShortCode(watchFileId)
      : createWatchClaimCode(watchFileDocumentId)
  const baseUrl = getClaimBaseUrl()
  void locale

  return `${baseUrl}/activation?code=${encodeURIComponent(code)}`
}
