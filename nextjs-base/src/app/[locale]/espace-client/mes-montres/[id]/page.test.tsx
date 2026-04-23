import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getCurrentStrapiUserMock,
  redirectMock,
  notFoundMock,
  strapiAuthGetMock,
} = vi.hoisted(() => ({
  getCurrentStrapiUserMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
  notFoundMock: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
  strapiAuthGetMock: vi.fn(),
}))

vi.mock('@/lib/strapi-session-cookie', () => ({
  getCurrentStrapiUser: getCurrentStrapiUserMock,
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  notFound: notFoundMock,
}))

vi.mock('@/lib/strapi-auth-client', () => ({
  strapiAuthGet: strapiAuthGetMock,
}))

vi.mock('@/lib/strapi', () => ({
  cleanImageUrl: (url: string | undefined) => url,
}))

import WatchFileDetailPage from './page'

describe('WatchFileDetailPage', () => {
  beforeEach(() => {
    getCurrentStrapiUserMock.mockReset()
    redirectMock.mockClear()
    notFoundMock.mockClear()
    strapiAuthGetMock.mockReset()
  })

  it('redirects unauthenticated users to login', async () => {
    getCurrentStrapiUserMock.mockResolvedValue(null)

    await expect(
      WatchFileDetailPage({
        params: Promise.resolve({ locale: 'fr', id: 'watch_1' }),
      })
    ).rejects.toThrow('REDIRECT:/fr/espace-client/connexion')
  })

  it('calls notFound when the watch file is missing', async () => {
    getCurrentStrapiUserMock.mockResolvedValue({
      id: 1,
      email: 'client@example.com',
      username: 'client',
    })
    strapiAuthGetMock.mockResolvedValue({ data: null, error: 'Not found' })

    await expect(
      WatchFileDetailPage({
        params: Promise.resolve({ locale: 'fr', id: 'watch_1' }),
      })
    ).rejects.toThrow('NOT_FOUND')
  })

  it('loads the watch file details for authenticated users', async () => {
    getCurrentStrapiUserMock.mockResolvedValue({
      id: 1,
      email: 'client@example.com',
      username: 'client',
    })
    strapiAuthGetMock.mockResolvedValue({
      data: {
        data: {
          documentId: 'watch_1',
          title: 'Omega de test',
          createdAt: '2026-04-23T10:00:00.000Z',
          updatedAt: '2026-04-23T10:00:00.000Z',
          product: { name: 'Omega', slug: 'omega' },
          photos_before: [],
          photos_after: [],
        },
      },
      error: null,
    })

    const result = await WatchFileDetailPage({
      params: Promise.resolve({ locale: 'fr', id: 'watch_1' }),
    })

    expect(strapiAuthGetMock).toHaveBeenCalledWith(
      '/watch-files/watch_1?populate[photos_before]=true&populate[photos_after]=true&populate[order]=true&populate[product]=true&populate[customer]=true',
      0
    )
    expect(notFoundMock).not.toHaveBeenCalled()
    expect(redirectMock).not.toHaveBeenCalled()
    expect(result).toBeTruthy()
  })
})
