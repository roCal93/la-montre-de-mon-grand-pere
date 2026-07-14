import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createWatchClaimTokenMock } = vi.hoisted(() => ({
  createWatchClaimTokenMock: vi.fn(),
}))

vi.mock('@/lib/watch-claim-token', () => ({
  createWatchClaimToken: createWatchClaimTokenMock,
}))

import { buildWatchClaimUrl } from './watch-claim-url'

const OLD_CLAIM_BASE_URL = process.env.CLAIM_QR_BASE_URL
const OLD_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL

describe('buildWatchClaimUrl', () => {
  beforeEach(() => {
    createWatchClaimTokenMock.mockReset()
    createWatchClaimTokenMock.mockReturnValue('token.abc')
    process.env.CLAIM_QR_BASE_URL = 'https://atelier.example.com/'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://fallback.example.com'
  })

  afterEach(() => {
    process.env.CLAIM_QR_BASE_URL = OLD_CLAIM_BASE_URL
    process.env.NEXT_PUBLIC_SITE_URL = OLD_SITE_URL
  })

  it('builds claim url using CLAIM_QR_BASE_URL', () => {
    expect(buildWatchClaimUrl('wf_123', 'fr')).toBe(
      'https://atelier.example.com/fr/espace-client/claim?token=token.abc'
    )
  })

  it('falls back to NEXT_PUBLIC_SITE_URL when claim base url is missing', () => {
    process.env.CLAIM_QR_BASE_URL = ''

    expect(buildWatchClaimUrl('wf_123', 'fr')).toBe(
      'https://fallback.example.com/fr/espace-client/claim?token=token.abc'
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
