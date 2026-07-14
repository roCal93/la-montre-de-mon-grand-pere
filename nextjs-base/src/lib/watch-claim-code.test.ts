import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createWatchClaimCode, verifyWatchClaimCode } from './watch-claim-code'

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
})
