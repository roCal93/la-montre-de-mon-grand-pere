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

vi.mock('./NouvelleDemandeForm', () => ({
  NouvelleDemandeForm: ({
    locale,
    watchFiles,
  }: {
    locale: string
    watchFiles: Array<{ documentId: string; title: string }>
  }) => ({
    type: 'NouvelleDemandeForm',
    props: { locale, watchFiles },
  }),
}))

import NouvelleDemandeServicePage from './page'

describe('NouvelleDemandeServicePage', () => {
  beforeEach(() => {
    getCurrentStrapiUserMock.mockReset()
    redirectMock.mockClear()
    strapiAuthGetMock.mockReset()
  })

  it('redirects unauthenticated users to login', async () => {
    getCurrentStrapiUserMock.mockResolvedValue(null)

    await expect(
      NouvelleDemandeServicePage({ params: Promise.resolve({ locale: 'fr' }) })
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
            product: { name: 'Omega' },
          },
        ],
      },
    })

    const result = await NouvelleDemandeServicePage({
      params: Promise.resolve({ locale: 'fr' }),
    })

    expect(strapiAuthGetMock).toHaveBeenCalledWith(
      '/watch-files?fields[0]=title&sort=createdAt:desc&populate[product][fields][0]=name',
      0
    )
    expect(result).toMatchObject({
      props: {
        locale: 'fr',
        watchFiles: [{ documentId: 'watch_1', title: 'Omega de test' }],
      },
    })
    expect(redirectMock).not.toHaveBeenCalled()
  })
})
