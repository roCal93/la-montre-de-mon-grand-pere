import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createWatchClaimCodeMock } = vi.hoisted(() => ({
  createWatchClaimCodeMock: vi.fn(),
}))

vi.mock('@/lib/watch-claim-code', () => ({
  createWatchClaimCode: createWatchClaimCodeMock,
}))

import { buildWatchClaimUrl } from './watch-claim-url'

const OLD_CLAIM_BASE_URL = process.env.CLAIM_QR_BASE_URL
const OLD_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL

describe('buildWatchClaimUrl', () => {
  beforeEach(() => {
    createWatchClaimCodeMock.mockReset()
    createWatchClaimCodeMock.mockReturnValue('shortcode1')
    process.env.CLAIM_QR_BASE_URL = 'https://atelier.example.com/'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://fallback.example.com'
  })

  afterEach(() => {
    process.env.CLAIM_QR_BASE_URL = OLD_CLAIM_BASE_URL
    process.env.NEXT_PUBLIC_SITE_URL = OLD_SITE_URL
  })

  it('builds claim url using CLAIM_QR_BASE_URL', () => {
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
