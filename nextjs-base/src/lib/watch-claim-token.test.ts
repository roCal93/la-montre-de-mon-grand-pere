import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createWatchClaimToken,
  verifyWatchClaimToken,
} from './watch-claim-token'

const OLD_CLAIM_SECRET = process.env.CLAIM_QR_SECRET

describe('watch claim token', () => {
  beforeEach(() => {
    process.env.CLAIM_QR_SECRET = 'test-claim-secret'
  })

  afterEach(() => {
    process.env.CLAIM_QR_SECRET = OLD_CLAIM_SECRET
  })

  it('creates and verifies a valid token', () => {
    const token = createWatchClaimToken('watch_doc_123', {
      nowSeconds: 1_700_000_000,
      ttlSeconds: 60,
      jti: 'jti-1',
    })

    const result = verifyWatchClaimToken(token, { nowSeconds: 1_700_000_030 })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.watchFileDocumentId).toBe('watch_doc_123')
    expect(result.payload.jti).toBe('jti-1')
  })

  it('rejects tampered tokens', () => {
    const token = createWatchClaimToken('watch_doc_123', {
      nowSeconds: 1_700_000_000,
      ttlSeconds: 60,
      jti: 'jti-1',
    })

    const [payload, signature] = token.split('.')
    const tampered = `${payload}.${signature}x`
    const result = verifyWatchClaimToken(tampered, {
      nowSeconds: 1_700_000_010,
    })
    expect(result).toEqual({ ok: false, reason: 'invalid_signature' })
  })

  it('rejects expired tokens', () => {
    const token = createWatchClaimToken('watch_doc_123', {
      nowSeconds: 1_700_000_000,
      ttlSeconds: 10,
      jti: 'jti-1',
    })

    const result = verifyWatchClaimToken(token, { nowSeconds: 1_700_000_020 })
    expect(result).toEqual({ ok: false, reason: 'expired' })
  })
})
