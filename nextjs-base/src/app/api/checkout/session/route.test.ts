import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { getCurrentStrapiUserMock, getStripeMock } = vi.hoisted(() => ({
  getCurrentStrapiUserMock: vi.fn(),
  getStripeMock: vi.fn(),
}))

vi.mock('@/lib/strapi-session-cookie', () => ({
  getCurrentStrapiUser: getCurrentStrapiUserMock,
}))

vi.mock('@/lib/stripe', () => ({
  getStripe: getStripeMock,
}))

vi.mock('@/lib/currency', () => ({
  toCents: (value: number) => Math.round(value * 100),
}))

import { POST } from './route'

describe('POST /api/checkout/session', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_STRAPI_URL = 'http://strapi.test'
    process.env.STRAPI_API_TOKEN = 'token'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://site.test'
    getCurrentStrapiUserMock.mockReset()
    getStripeMock.mockReset()
    vi.restoreAllMocks()
  })

  it('returns 401 when the user is not authenticated', async () => {
    getCurrentStrapiUserMock.mockResolvedValue(null)

    const res = await POST(
      new NextRequest('https://site.test/api/checkout/session', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            {
              id: 1,
              documentId: 'doc_1',
              name: 'Eza',
              slug: 'eza',
              price: 220,
              quantity: 1,
            },
          ],
          locale: 'fr',
        }),
      })
    )

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({
      error: 'Non authentifié',
    })
    expect(getStripeMock).not.toHaveBeenCalled()
  })
})
