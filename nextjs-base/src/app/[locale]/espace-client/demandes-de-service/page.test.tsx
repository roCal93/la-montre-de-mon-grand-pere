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

import DemandesDeServicePage from './page'

describe('DemandesDeServicePage', () => {
  beforeEach(() => {
    getCurrentStrapiUserMock.mockReset()
    redirectMock.mockClear()
    strapiAuthGetMock.mockReset()
  })

  it('redirects unauthenticated users to login', async () => {
    getCurrentStrapiUserMock.mockResolvedValue(null)

    await expect(
      DemandesDeServicePage({ params: Promise.resolve({ locale: 'fr' }) })
    ).rejects.toThrow('REDIRECT:/fr/espace-client/connexion')
  })

  it('loads service requests for authenticated users', async () => {
    getCurrentStrapiUserMock.mockResolvedValue({
      id: 1,
      email: 'client@example.com',
      username: 'client',
    })
    strapiAuthGetMock.mockResolvedValue({
      data: {
        data: [
          {
            documentId: 'req_1',
            type: 'reparation',
            status: 'pending',
            createdAt: '2026-04-23T10:00:00.000Z',
          },
        ],
      },
    })

    const result = await DemandesDeServicePage({
      params: Promise.resolve({ locale: 'fr' }),
    })

    expect(strapiAuthGetMock).toHaveBeenCalledWith(
      '/service-requests?sort=createdAt:desc',
      0
    )
    expect(redirectMock).not.toHaveBeenCalled()
    expect(result).toBeTruthy()
  })
})
