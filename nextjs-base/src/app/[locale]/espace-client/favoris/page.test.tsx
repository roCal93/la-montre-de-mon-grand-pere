import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getCurrentStrapiUserMock, redirectMock, strapiAuthGetMock } =
  vi.hoisted(() => ({
    getCurrentStrapiUserMock: vi.fn(),
    redirectMock: vi.fn((url: string) => {
      throw new Error(`REDIRECT:${url}`)
    }),
    strapiAuthGetMock: vi.fn(),
  }))

vi.mock('@/lib/strapi-session-cookie', () => ({
  getCurrentStrapiUser: getCurrentStrapiUserMock,
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('@/lib/strapi-auth-client', () => ({
  strapiAuthGet: strapiAuthGetMock,
}))

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
    getCurrentStrapiUserMock.mockReset()
    redirectMock.mockClear()
    strapiAuthGetMock.mockReset()
  })

  it('redirects unauthenticated users to login', async () => {
    getCurrentStrapiUserMock.mockResolvedValue(null)

    await expect(
      FavorisPage({ params: Promise.resolve({ locale: 'fr' }) })
    ).rejects.toThrow('REDIRECT:/fr/espace-client/connexion')
  })

  it('loads wishlist items for authenticated users', async () => {
    getCurrentStrapiUserMock.mockResolvedValue({
      id: 1,
      email: 'client@example.com',
      username: 'client',
    })
    strapiAuthGetMock.mockResolvedValue({
      data: {
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
      },
    })

    const result = await FavorisPage({
      params: Promise.resolve({ locale: 'fr' }),
    })

    expect(strapiAuthGetMock).toHaveBeenCalledWith(
      '/wishlist-items?populate[product][populate]=images',
      0
    )
    expect(redirectMock).not.toHaveBeenCalled()
    expect(result).toBeTruthy()
  })
})
