import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getCurrentStrapiUserMock, notFoundMock, redirectMock } = vi.hoisted(
  () => ({
    getCurrentStrapiUserMock: vi.fn(),
    notFoundMock: vi.fn(() => {
      throw new Error('NOT_FOUND')
    }),
    redirectMock: vi.fn((url: string) => {
      throw new Error(`REDIRECT:${url}`)
    }),
  })
)

vi.mock('@/lib/strapi-session-cookie', () => ({
  getCurrentStrapiUser: getCurrentStrapiUserMock,
}))

vi.mock('@/lib/currency', () => ({
  formatPrice: (value: number) => `${value} EUR`,
}))

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}))

vi.mock('@/lib/strapi', () => ({
  cleanImageUrl: (url: string | undefined) => url,
}))

import CommandeDetailPage from './page'

describe('CommandeDetailPage security', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_STRAPI_URL = 'http://strapi.test'
    process.env.STRAPI_API_TOKEN = 'token'
    getCurrentStrapiUserMock.mockReset()
    notFoundMock.mockClear()
    redirectMock.mockClear()
    vi.restoreAllMocks()
  })

  it('redirects to login when user is not authenticated', async () => {
    getCurrentStrapiUserMock.mockResolvedValue(null)

    await expect(
      CommandeDetailPage({
        params: Promise.resolve({ locale: 'fr', id: 'doc_1' }),
      })
    ).rejects.toThrow('REDIRECT:/fr/espace-client/connexion')
  })

  it('calls notFound when order is not owned by authenticated user', async () => {
    getCurrentStrapiUserMock.mockResolvedValue({
      id: 1,
      email: 'owner@example.com',
      username: 'owner',
    })
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    )

    await expect(
      CommandeDetailPage({
        params: Promise.resolve({ locale: 'fr', id: 'doc_2' }),
      })
    ).rejects.toThrow('NOT_FOUND')

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        'filters[customerEmail][$eqi]=owner%40example.com'
      ),
      expect.any(Object)
    )
  })
})
