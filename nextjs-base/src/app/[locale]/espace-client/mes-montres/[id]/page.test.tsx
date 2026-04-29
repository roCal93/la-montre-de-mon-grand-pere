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

  it('calls notFound when the watch file belongs to another customer', async () => {
    getCurrentStrapiUserMock.mockResolvedValue({
      id: 1,
      email: 'client@example.com',
      username: 'client',
    })
    strapiAuthGetMock.mockResolvedValue({
      data: {
        data: {
          documentId: 'watch_1',
          reference: 'MGP0001',
          createdAt: '2026-04-23T10:00:00.000Z',
          updatedAt: '2026-04-23T10:00:00.000Z',
          customer: { id: 2 },
          product: { name: 'Omega', slug: 'omega', images: [] },
          publicBeforeImage: [],
          publicAfterImage: [],
        },
      },
      error: null,
    })

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
          reference: 'MGP0001',
          createdAt: '2026-04-23T10:00:00.000Z',
          updatedAt: '2026-04-23T10:00:00.000Z',
          customer: { id: 1 },
          product: { name: 'Omega', slug: 'omega', images: [] },
          publicBeforeImage: [],
          publicAfterImage: [],
        },
      },
      error: null,
    })

    const result = await WatchFileDetailPage({
      params: Promise.resolve({ locale: 'fr', id: 'watch_1' }),
    })

    expect(strapiAuthGetMock).toHaveBeenCalledWith(
      '/watch-files/watch_1?populate%5BpublicBadges%5D=true&populate%5Border%5D=true&populate%5Bproduct%5D%5Bpopulate%5D%5Bimages%5D%5Bfields%5D%5B0%5D=url&populate%5Bproduct%5D%5Bpopulate%5D%5Bimages%5D%5Bfields%5D%5B1%5D=alternativeText&populate%5Bcustomer%5D=true&populate%5BetatGeneral%5D%5Bpopulate%5D%5B0%5D=etatGeneralGlobal&populate%5BetatGeneral%5D%5Bpopulate%5D%5B1%5D=fonctionnementAvantIntervention&populate%5BetatGeneral%5D%5Bpopulate%5D%5B2%5D=etatVisuelComposants&populate%5BoperationsReparation%5D%5Bpopulate%5D%5B0%5D=operationsEffectuees&populate%5BoperationsReparation%5D%5Bpopulate%5D%5B1%5D=piecesRemplacees&populate%5BcontroleQualiteMesures%5D%5Bpopulate%5D%5B0%5D=reglageEtPrecision&populate%5BcontroleQualiteMesures%5D%5Bpopulate%5D%5B1%5D=testEtancheite&populate%5BvalidationAtelier%5D%5Bpopulate%5D%5B0%5D=signature&populate%5BdossierBlocks%5D%5Bon%5D%5Bwatch-file.rich-text-block%5D%5Bpopulate%5D=*&populate%5BdossierBlocks%5D%5Bon%5D%5Bwatch-file.image-block%5D%5Bpopulate%5D%5Bimage%5D=true&populate%5BdossierBlocks%5D%5Bon%5D%5Bwatch-file.text-image-block%5D%5Bpopulate%5D%5Bimage%5D=true&populate%5BdossierBlocks%5D%5Bon%5D%5Bwatch-file.before-after-block%5D%5Bpopulate%5D%5BbeforeImage%5D=true&populate%5BdossierBlocks%5D%5Bon%5D%5Bwatch-file.before-after-block%5D%5Bpopulate%5D%5BafterImage%5D=true&populate%5BdossierBlocks%5D%5Bon%5D%5Bwatch-file.video-block%5D%5Bpopulate%5D%5Bvideo%5D=true&populate%5BdossierBlocks%5D%5Bon%5D%5Bwatch-file.audio-block%5D%5Bpopulate%5D%5Baudio%5D=true',
      0
    )
    expect(notFoundMock).not.toHaveBeenCalled()
    expect(redirectMock).not.toHaveBeenCalled()
    expect(result).toBeTruthy()
  })
})
