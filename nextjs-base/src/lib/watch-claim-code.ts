import { createHmac, timingSafeEqual } from 'node:crypto'
import {
  formatWatchClaimCodeForDisplay,
  normalizeWatchClaimCodeInput,
} from './watch-claim-code-format'

const LEGACY_CODE_SIG_LENGTH = 8
const SHORT_CODE_SIG_LENGTH = 6
const SHORT_CODE_PREFIX = 'c'

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

function createCodeSignature(
  payload: string,
  secret: string,
  sigLength: number
) {
  return createHmac('sha256', secret)
    .update(payload)
    .digest('base64url')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, sigLength)
    .toLowerCase()
}

function signaturesMatch(provided: string, expected: string) {
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)

  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  )
}

export function createWatchClaimCode(watchFileDocumentId: string) {
  const normalizedDocumentId = watchFileDocumentId.trim().toLowerCase()
  if (!normalizedDocumentId) {
    throw new Error('watchFileDocumentId requis')
  }

  const secret = getClaimCodeSecret()
  const signature = createCodeSignature(
    normalizedDocumentId,
    secret,
    LEGACY_CODE_SIG_LENGTH
  )
  return `${normalizedDocumentId}${signature}`
}

export function createWatchClaimShortCode(watchFileId: number) {
  if (!Number.isInteger(watchFileId) || watchFileId <= 0) {
    throw new Error('watchFileId invalide')
  }

  const payload = watchFileId.toString(36)
  const secret = getClaimCodeSecret()
  const signature = createCodeSignature(payload, secret, SHORT_CODE_SIG_LENGTH)
  return `${SHORT_CODE_PREFIX}${payload}${signature}`
}

export function verifyWatchClaimCode(code: string): {
  ok: boolean
  watchFileDocumentId?: string
  watchFileId?: number
} {
  const normalizedCode = normalizeWatchClaimCodeInput(code)

  if (
    normalizedCode.startsWith(SHORT_CODE_PREFIX) &&
    normalizedCode.length > SHORT_CODE_PREFIX.length + SHORT_CODE_SIG_LENGTH
  ) {
    const payloadAndSig = normalizedCode.slice(SHORT_CODE_PREFIX.length)
    const payload = payloadAndSig.slice(0, -SHORT_CODE_SIG_LENGTH)
    const providedSignature = payloadAndSig.slice(-SHORT_CODE_SIG_LENGTH)

    if (!/^[a-z0-9]+$/.test(payload)) {
      return { ok: false }
    }

    const watchFileId = Number.parseInt(payload, 36)
    if (!Number.isInteger(watchFileId) || watchFileId <= 0) {
      return { ok: false }
    }

    const secret = getClaimCodeSecret()
    const expectedSignature = createCodeSignature(
      payload,
      secret,
      SHORT_CODE_SIG_LENGTH
    )

    if (!signaturesMatch(providedSignature, expectedSignature)) {
      return { ok: false }
    }

    return { ok: true, watchFileId }
  }

  if (normalizedCode.length <= LEGACY_CODE_SIG_LENGTH) {
    return { ok: false }
  }

  const watchFileDocumentId = normalizedCode.slice(0, -LEGACY_CODE_SIG_LENGTH)
  const providedSignature = normalizedCode.slice(-LEGACY_CODE_SIG_LENGTH)

  if (!watchFileDocumentId || !providedSignature) {
    return { ok: false }
  }

  const secret = getClaimCodeSecret()
  const expectedSignature = createCodeSignature(
    watchFileDocumentId,
    secret,
    LEGACY_CODE_SIG_LENGTH
  )

  if (!signaturesMatch(providedSignature, expectedSignature)) {
    return { ok: false }
  }

  return { ok: true, watchFileDocumentId }
}

export { formatWatchClaimCodeForDisplay }
