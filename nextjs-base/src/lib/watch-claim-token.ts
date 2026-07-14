import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 180

interface WatchClaimPayload {
  v: 1
  wid: string
  iat: number
  exp: number
  jti: string
}

export type WatchClaimVerificationResult =
  | { ok: true; watchFileDocumentId: string; payload: WatchClaimPayload }
  | {
      ok: false
      reason:
        'invalid_format' | 'invalid_signature' | 'expired' | 'invalid_payload'
    }

function getClaimSecret() {
  const secret =
    process.env.CLAIM_QR_SECRET?.trim() || process.env.AUTH_SECRET?.trim()
  if (!secret) {
    throw new Error('CLAIM_QR_SECRET manquant')
  }
  return secret
}

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signPayload(payloadB64: string, secret: string) {
  return createHmac('sha256', secret).update(payloadB64).digest('base64url')
}

export function createWatchClaimToken(
  watchFileDocumentId: string,
  options?: { nowSeconds?: number; ttlSeconds?: number; jti?: string }
) {
  const normalizedWatchFileDocumentId = watchFileDocumentId.trim()
  if (!normalizedWatchFileDocumentId) {
    throw new Error('watchFileDocumentId requis')
  }

  const nowSeconds = options?.nowSeconds ?? Math.floor(Date.now() / 1000)
  const ttlSeconds = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS
  const payload: WatchClaimPayload = {
    v: 1,
    wid: normalizedWatchFileDocumentId,
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
    jti: options?.jti ?? randomUUID(),
  }

  const secret = getClaimSecret()
  const payloadB64 = toBase64Url(JSON.stringify(payload))
  const signature = signPayload(payloadB64, secret)

  return `${payloadB64}.${signature}`
}

export function verifyWatchClaimToken(
  token: string,
  options?: { nowSeconds?: number }
): WatchClaimVerificationResult {
  const [payloadB64, signature] = token.split('.')
  if (!payloadB64 || !signature) {
    return { ok: false, reason: 'invalid_format' }
  }

  const secret = getClaimSecret()
  const expectedSignature = signPayload(payloadB64, secret)

  const providedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return { ok: false, reason: 'invalid_signature' }
  }

  try {
    const parsed = JSON.parse(
      fromBase64Url(payloadB64)
    ) as Partial<WatchClaimPayload>

    if (
      parsed.v !== 1 ||
      typeof parsed.wid !== 'string' ||
      !parsed.wid.trim() ||
      typeof parsed.iat !== 'number' ||
      typeof parsed.exp !== 'number' ||
      typeof parsed.jti !== 'string' ||
      !parsed.jti.trim()
    ) {
      return { ok: false, reason: 'invalid_payload' }
    }

    const nowSeconds = options?.nowSeconds ?? Math.floor(Date.now() / 1000)
    if (parsed.exp <= nowSeconds) {
      return { ok: false, reason: 'expired' }
    }

    return {
      ok: true,
      watchFileDocumentId: parsed.wid.trim(),
      payload: parsed as WatchClaimPayload,
    }
  } catch {
    return { ok: false, reason: 'invalid_payload' }
  }
}
