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

import TableauDeBordPage from './page'

describe('TableauDeBordPage', () => {
  beforeEach(() => {
    getCurrentStrapiUserMock.mockReset()
    redirectMock.mockClear()
    strapiAuthGetMock.mockReset()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('redirects unauthenticated users to login', async () => {
    getCurrentStrapiUserMock.mockResolvedValue(null)

    await expect(
      TableauDeBordPage({ params: Promise.resolve({ locale: 'fr' }) })
    ).rejects.toThrow('REDIRECT:/fr/espace-client/connexion')
  })

  it('loads dashboard data for authenticated users', async () => {
    getCurrentStrapiUserMock.mockResolvedValue({
      id: 1,
      email: 'client@example.com',
      username: 'client',
    })

    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: [] }),
    } as unknown as Response)
    strapiAuthGetMock.mockResolvedValue({ data: { data: [] } })

    const result = await TableauDeBordPage({
      params: Promise.resolve({ locale: 'fr' }),
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/orders?filters[customerEmail][$eq]=client%40example.com'
      ),
      expect.objectContaining({ cache: 'no-store' })
    )
    expect(strapiAuthGetMock).toHaveBeenNthCalledWith(
      1,
      '/watch-files?sort=createdAt:desc&pagination[limit]=5',
      0
    )
    expect(strapiAuthGetMock).toHaveBeenNthCalledWith(
      2,
      '/service-requests?sort=createdAt:desc&pagination[limit]=5',
      0
    )
    expect(redirectMock).not.toHaveBeenCalled()
    expect(result).toBeTruthy()
  })
})
