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

import MesMontrePage from './page'

describe('MesMontrePage', () => {
  beforeEach(() => {
    getCurrentStrapiUserMock.mockReset()
    redirectMock.mockClear()
    strapiAuthGetMock.mockReset()
  })

  it('redirects unauthenticated users to login', async () => {
    getCurrentStrapiUserMock.mockResolvedValue(null)

    await expect(
      MesMontrePage({ params: Promise.resolve({ locale: 'fr' }) })
    ).rejects.toThrow('REDIRECT:/fr/espace-client/connexion')
  })

  it('loads watch files for authenticated users', async () => {
    getCurrentStrapiUserMock.mockResolvedValue({
      id: 1,
      email: 'client@example.com',
      username: 'client',
    })
    strapiAuthGetMock.mockResolvedValue({
      data: {
        data: [
          {
            documentId: 'watch_1',
            title: 'Omega de test',
            createdAt: '2026-04-23T10:00:00.000Z',
            product: { name: 'Omega' },
          },
        ],
      },
    })

    const result = await MesMontrePage({
      params: Promise.resolve({ locale: 'fr' }),
    })

    expect(strapiAuthGetMock).toHaveBeenCalledWith(
      '/watch-files?sort=createdAt:desc&populate[product]=true',
      0
    )
    expect(redirectMock).not.toHaveBeenCalled()
    expect(result).toBeTruthy()
  })
})
