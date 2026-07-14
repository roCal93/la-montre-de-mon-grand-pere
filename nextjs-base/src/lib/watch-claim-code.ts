import { createHmac, timingSafeEqual } from 'node:crypto'

const CODE_SIG_LENGTH = 8

function getClaimCodeSecret() {
  const secret =
    process.env.CLAIM_CODE_SECRET?.trim() ||
    process.env.CLAIM_QR_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim()

  if (!secret) {
    throw new Error('CLAIM_CODE_SECRET manquant')
  }

  return secret
}

function createCodeSignature(documentId: string, secret: string) {
  return createHmac('sha256', secret)
    .update(documentId)
    .digest('base64url')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, CODE_SIG_LENGTH)
    .toLowerCase()
}

export function createWatchClaimCode(watchFileDocumentId: string) {
  const normalizedDocumentId = watchFileDocumentId.trim().toLowerCase()
  if (!normalizedDocumentId) {
    throw new Error('watchFileDocumentId requis')
  }

  const secret = getClaimCodeSecret()
  const signature = createCodeSignature(normalizedDocumentId, secret)
  return `${normalizedDocumentId}${signature}`
}

export function verifyWatchClaimCode(code: string): {
  ok: boolean
  watchFileDocumentId?: string
} {
  const normalizedCode = code.trim().toLowerCase()
  if (normalizedCode.length <= CODE_SIG_LENGTH) {
    return { ok: false }
  }

  const watchFileDocumentId = normalizedCode.slice(0, -CODE_SIG_LENGTH)
  const providedSignature = normalizedCode.slice(-CODE_SIG_LENGTH)

  if (!watchFileDocumentId || !providedSignature) {
    return { ok: false }
  }

  const secret = getClaimCodeSecret()
  const expectedSignature = createCodeSignature(watchFileDocumentId, secret)

  const providedBuffer = Buffer.from(providedSignature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return { ok: false }
  }

  return { ok: true, watchFileDocumentId }
}
