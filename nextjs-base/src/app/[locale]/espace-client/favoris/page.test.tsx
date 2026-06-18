import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authMock, redirectMock, fetchMock, getStrapiSessionJwtMock } =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    redirectMock: vi.fn((url: string) => {
      throw new Error(`REDIRECT:${url}`)
    }),
    fetchMock: vi.fn(),
    getStrapiSessionJwtMock: vi.fn(),
  }))

vi.mock('@/auth', () => ({
  auth: authMock,
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('@/lib/strapi-session-cookie', () => ({
  getStrapiSessionJwt: getStrapiSessionJwtMock,
}))

vi.stubGlobal('fetch', fetchMock)

vi.mock('@/lib/strapi', () => ({
  cleanImageUrl: (url: string | undefined) => url,
}))

vi.mock('@/lib/currency', () => ({
  formatPrice: (value: number) => `${value} EUR`,
}))

vi.mock('@/components/espace-client/WishlistRemoveButton', () => ({
  WishlistRemoveButton: ({ itemId }: { itemId: string }) => ({
    type: 'WishlistRemoveButton',
    props: { itemId },
  }),
}))

import FavorisPage from './page'

describe('FavorisPage', () => {
  beforeEach(() => {
    authMock.mockReset()
    redirectMock.mockClear()
    fetchMock.mockReset()
    getStrapiSessionJwtMock.mockReset()
    getStrapiSessionJwtMock.mockResolvedValue(null)
    process.env.NEXT_PUBLIC_STRAPI_URL = 'http://localhost:1337'
    process.env.STRAPI_WRITE_API_TOKEN = 'test-token'
  })

  it('redirects unauthenticated users to login', async () => {
    authMock.mockResolvedValue(null)

    await expect(
      FavorisPage({ params: Promise.resolve({ locale: 'fr' }) })
    ).rejects.toThrow('REDIRECT:/fr/espace-client/connexion')
  })

  it('loads wishlist items for authenticated users', async () => {
    authMock.mockResolvedValue({
      user: { id: '1', email: 'client@example.com', name: 'client' },
    })
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            documentId: 'wish_1',
            product: {
              documentId: 'prod_1',
              name: 'Omega',
              slug: 'omega',
              price: 1200,
              active: true,
              images: [],
            },
          },
        ],
      }),
    })

    const result = await FavorisPage({
      params: Promise.resolve({ locale: 'fr' }),
    })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/wishlist-items'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-hakuna-customer-id': '1',
        }),
      })
    )
    expect(redirectMock).not.toHaveBeenCalled()
    expect(result).toBeTruthy()
  })
})
