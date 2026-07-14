import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createWatchClaimCode,
  createWatchClaimShortCode,
  formatWatchClaimCodeForDisplay,
  verifyWatchClaimCode,
} from './watch-claim-code'

const OLD_CLAIM_CODE_SECRET = process.env.CLAIM_CODE_SECRET

describe('watch claim code', () => {
  beforeEach(() => {
    process.env.CLAIM_CODE_SECRET = 'test-claim-code-secret'
  })

  afterEach(() => {
    process.env.CLAIM_CODE_SECRET = OLD_CLAIM_CODE_SECRET
  })

  it('creates and verifies a valid code', () => {
    const code = createWatchClaimCode('wf_document_123')
    const verified = verifyWatchClaimCode(code)

    expect(verified).toEqual({
      ok: true,
      watchFileDocumentId: 'wf_document_123',
    })
  })

  it('rejects tampered codes', () => {
    const code = createWatchClaimCode('wf_document_123')
    const tampered = `${code.slice(0, -1)}x`

    expect(verifyWatchClaimCode(tampered)).toEqual({ ok: false })
  })

  it('creates and verifies a short code from watchFileId', () => {
    const code = createWatchClaimShortCode(12345)
    const verified = verifyWatchClaimCode(code)

    expect(verified).toEqual({ ok: true, watchFileId: 12345 })
  })

  it('accepts short code with separators for manual entry', () => {
    const code = createWatchClaimShortCode(98_765)
    const grouped = `${code.slice(0, 4)}-${code.slice(4)}`

    expect(verifyWatchClaimCode(grouped)).toEqual({
      ok: true,
      watchFileId: 98_765,
    })
  })

  it('formats code for display with groups', () => {
    expect(formatWatchClaimCodeForDisplay('cabc123def456')).toBe(
      'CABC-123D-EF45-6'
    )
    expect(formatWatchClaimCodeForDisplay(' cabc-123def456 ')).toBe(
      'CABC-123D-EF45-6'
    )
  })
})
