import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { getStrapiSessionJwtMock, renderToBufferMock } = vi.hoisted(() => ({
  getStrapiSessionJwtMock: vi.fn(),
  renderToBufferMock: vi.fn(),
}))

vi.mock('@/lib/strapi-session-cookie', () => ({
  getStrapiSessionJwt: getStrapiSessionJwtMock,
}))

vi.mock('@react-pdf/renderer', () => ({
  Document: 'Document',
  Page: 'Page',
  Text: 'Text',
  View: 'View',
  StyleSheet: { create: (v: unknown) => v },
  renderToBuffer: renderToBufferMock,
}))

import { GET } from './route'

describe('GET /api/watch-files/[id]/pdf', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_STRAPI_URL = 'http://strapi.test'
    getStrapiSessionJwtMock.mockReset()
    renderToBufferMock.mockReset()
    renderToBufferMock.mockResolvedValue(new Uint8Array([1, 2, 3]))
    vi.restoreAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    getStrapiSessionJwtMock.mockResolvedValue(null)

    const res = await GET({} as NextRequest, {
      params: Promise.resolve({ id: 'watch_1' }),
    })

    expect(res.status).toBe(401)
  })

  it('returns 403 when Strapi denies access to the dossier', async () => {
    getStrapiSessionJwtMock.mockResolvedValue('jwt')
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(null, { status: 403 })
    )

    const res = await GET({} as NextRequest, {
      params: Promise.resolve({ id: 'watch_2' }),
    })

    expect(res.status).toBe(403)
  })

  it('returns a PDF response when the user owns the dossier', async () => {
    getStrapiSessionJwtMock.mockResolvedValue('jwt')
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            documentId: 'watch_12345678',
            reference: 'MGP0001',
            etatGeneral: {
              etatGeneralGlobal: {
                boitier: { pourcentage: 85, commentaire: 'Tres bon' },
              },
            },
            operationsReparation: {
              operationsPubliques: 'Revision complete du mouvement',
            },
            controleQualiteMesures: {
              marcheMoyennePublique: '+6 s/j',
              etancheitePublique: '3 ATM',
            },
            validationAtelier: {
              dateFin: '2026-04-26',
              signature: { url: '/signature.png' },
            },
            dateReception: '2026-04-14',
            dateMiseEnVente: '2026-04-24',
            publicBeforeImage: [{ url: '/before.jpg' }],
            publicAfterImage: [{ url: '/after.jpg' }],
            product: { name: 'Europ Union' },
            order: { documentId: 'ord_12345678', createdAt: '2026-04-24' },
          },
        }),
        { status: 200 }
      )
    )

    const res = await GET({} as NextRequest, {
      params: Promise.resolve({ id: 'watch_12345678' }),
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toContain(
      'dossier-mgp0001.pdf'
    )
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      'populate%5BetatGeneral%5D%5Bpopulate%5D%5B0%5D=etatGeneralGlobal'
    )
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      'populate%5BoperationsReparation%5D%5Bpopulate%5D%5B0%5D=operationsEffectuees'
    )
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      'populate%5BcontroleQualiteMesures%5D%5Bpopulate%5D%5B0%5D=reglageEtPrecision'
    )
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      'populate%5BvalidationAtelier%5D%5Bpopulate%5D%5B0%5D=signature'
    )
    expect(renderToBufferMock).toHaveBeenCalledTimes(1)
  })
})
