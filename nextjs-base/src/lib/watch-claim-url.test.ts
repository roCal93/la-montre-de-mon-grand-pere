import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createWatchClaimCodeMock, createWatchClaimShortCodeMock } = vi.hoisted(
  () => ({
    createWatchClaimCodeMock: vi.fn(),
    createWatchClaimShortCodeMock: vi.fn(),
  })
)

vi.mock('@/lib/watch-claim-code', () => ({
  createWatchClaimCode: createWatchClaimCodeMock,
  createWatchClaimShortCode: createWatchClaimShortCodeMock,
}))

import { buildWatchClaimUrl } from './watch-claim-url'

const OLD_CLAIM_BASE_URL = process.env.CLAIM_QR_BASE_URL
const OLD_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL

describe('buildWatchClaimUrl', () => {
  beforeEach(() => {
    createWatchClaimCodeMock.mockReset()
    createWatchClaimShortCodeMock.mockReset()
    createWatchClaimCodeMock.mockReturnValue('shortcode1')
    createWatchClaimShortCodeMock.mockReturnValue('c1abcde')
    process.env.CLAIM_QR_BASE_URL = 'https://atelier.example.com/'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://fallback.example.com'
  })

  afterEach(() => {
    process.env.CLAIM_QR_BASE_URL = OLD_CLAIM_BASE_URL
    process.env.NEXT_PUBLIC_SITE_URL = OLD_SITE_URL
  })

  it('builds claim url using CLAIM_QR_BASE_URL', () => {
    expect(
      buildWatchClaimUrl(
        { watchFileDocumentId: 'wf_123', watchFileId: 42 },
        'fr'
      )
    ).toBe('https://atelier.example.com/activation?code=c1abcde')
    expect(createWatchClaimShortCodeMock).toHaveBeenCalledWith(42)
  })

  it('keeps documentId code path when no watchFileId is provided', () => {
    expect(buildWatchClaimUrl('wf_123', 'fr')).toBe(
      'https://atelier.example.com/activation?code=shortcode1'
    )
  })

  it('falls back to NEXT_PUBLIC_SITE_URL when claim base url is missing', () => {
    process.env.CLAIM_QR_BASE_URL = ''

    expect(buildWatchClaimUrl('wf_123', 'fr')).toBe(
      'https://fallback.example.com/activation?code=shortcode1'
    )
  })

  it('throws when no base url is configured', () => {
    process.env.CLAIM_QR_BASE_URL = ''
    process.env.NEXT_PUBLIC_SITE_URL = ''

    expect(() => buildWatchClaimUrl('wf_123', 'fr')).toThrow(
      'CLAIM_QR_BASE_URL ou NEXT_PUBLIC_SITE_URL manquant'
    )
  })
})
