import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

type PdfTestNode = {
  type?: unknown
  props?: {
    children?: unknown
    wrap?: boolean
    minPresenceAhead?: number
  }
}

type PdfDocumentElement = {
  type: (props: unknown) => PdfTestNode
  props: unknown
}

function isPdfTestNode(value: unknown): value is PdfTestNode {
  return typeof value === 'object' && value !== null
}

function toPdfTestNodes(value: unknown): PdfTestNode[] {
  const values = Array.isArray(value) ? value : [value]

  return values.filter(isPdfTestNode)
}

const {
  getCurrentStrapiUserMock,
  getStrapiSessionJwtMock,
  renderToBufferMock,
} = vi.hoisted(() => ({
  getCurrentStrapiUserMock: vi.fn(),
  getStrapiSessionJwtMock: vi.fn(),
  renderToBufferMock: vi.fn(),
}))

vi.mock('@/lib/strapi-session-cookie', () => ({
  getCurrentStrapiUser: getCurrentStrapiUserMock,
  getStrapiSessionJwt: getStrapiSessionJwtMock,
}))

vi.mock('@react-pdf/renderer', () => ({
  Document: 'Document',
  Page: 'Page',
  Text: 'Text',
  View: 'View',
  Image: 'Image',
  StyleSheet: { create: (v: unknown) => v },
  renderToBuffer: renderToBufferMock,
}))

import { GET } from './route'

function countPagesByHeading(
  documentElement: PdfDocumentElement,
  heading: string
) {
  const renderedDocument = documentElement.type(documentElement.props)
  const pages = toPdfTestNodes(renderedDocument.props?.children)

  return pages.filter((page) => {
    const children = toPdfTestNodes(page.props?.children)

    return children.some((child) => child.props?.children === heading)
  }).length
}

function collectElementsByType(
  node: unknown,
  type: string,
  results: PdfTestNode[] = []
) {
  if (!isPdfTestNode(node)) return results

  if (node.type === type) {
    results.push(node)
  }

  const childNodes = toPdfTestNodes(node.props?.children)

  for (const child of childNodes) {
    collectElementsByType(child, type, results)
  }

  return results
}

describe('GET /api/watch-files/[id]/pdf', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_STRAPI_URL = 'http://strapi.test'
    getCurrentStrapiUserMock.mockReset()
    getStrapiSessionJwtMock.mockReset()
    renderToBufferMock.mockReset()
    renderToBufferMock.mockResolvedValue(new Uint8Array([1, 2, 3]))
    vi.restoreAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    getStrapiSessionJwtMock.mockResolvedValue(null)
    getCurrentStrapiUserMock.mockResolvedValue(null)

    const res = await GET({} as NextRequest, {
      params: Promise.resolve({ id: 'watch_1' }),
    })

    expect(res.status).toBe(401)
  })

  it('returns 403 when Strapi denies access to the dossier', async () => {
    getStrapiSessionJwtMock.mockResolvedValue('jwt')
    getCurrentStrapiUserMock.mockResolvedValue({ id: 1 })
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(null, { status: 403 })
    )

    const res = await GET({} as NextRequest, {
      params: Promise.resolve({ id: 'watch_2' }),
    })

    expect(res.status).toBe(403)
  })

  it('returns 403 when the dossier belongs to another customer', async () => {
    getStrapiSessionJwtMock.mockResolvedValue('jwt')
    getCurrentStrapiUserMock.mockResolvedValue({ id: 1 })
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            documentId: 'watch_12345678',
            reference: 'MGP0001',
            customer: { id: 2 },
          },
        }),
        { status: 200 }
      )
    )

    const res = await GET({} as NextRequest, {
      params: Promise.resolve({ id: 'watch_12345678' }),
    })

    expect(res.status).toBe(403)
  })

  it('returns a PDF response when the user owns the dossier', async () => {
    getStrapiSessionJwtMock.mockResolvedValue('jwt')
    getCurrentStrapiUserMock.mockResolvedValue({ id: 1 })
    const payload = {
      data: {
        documentId: 'watch_12345678',
        reference: 'MGP0001',
        customer: { id: 1 },
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
    }
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify(payload), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(payload), { status: 200 })
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

  it('spreads oversized dossier blocks across multiple dossier pages', async () => {
    getStrapiSessionJwtMock.mockResolvedValue('jwt')
    getCurrentStrapiUserMock.mockResolvedValue({ id: 1 })

    const longParagraph = 'Intervention detaillee '.repeat(180)
    const richTextBlock = {
      type: 'paragraph',
      children: [{ type: 'text', text: longParagraph }],
    }

    const payload = {
      data: {
        documentId: 'watch_oversized',
        reference: 'MGP9999',
        customer: { id: 1 },
        dateReception: '2026-04-14',
        dateMiseEnVente: '2026-04-24',
        publicBeforeImage: [],
        publicAfterImage: [],
        product: { name: 'Europ Union' },
        dossierBlocks: [
          {
            __component: 'watch-file.rich-text-block',
            id: 1,
            title: 'Bloc 1',
            content: [richTextBlock],
          },
          {
            __component: 'watch-file.rich-text-block',
            id: 2,
            title: 'Bloc 2',
            content: [richTextBlock],
          },
          {
            __component: 'watch-file.rich-text-block',
            id: 3,
            title: 'Bloc 3',
            content: [richTextBlock],
          },
        ],
      },
    }

    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify(payload), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(payload), { status: 200 })
      )

    const res = await GET({} as NextRequest, {
      params: Promise.resolve({ id: 'watch_oversized' }),
    })

    expect(res.status).toBe(200)
    expect(renderToBufferMock).toHaveBeenCalledTimes(1)

    const documentElement = renderToBufferMock.mock.calls[0]?.[0]
    expect(
      countPagesByHeading(documentElement, '7. DOSSIER COMPLÉMENTAIRE')
    ).toBe(3)
  })

  it('wraps dossier image captions with their image container', async () => {
    getStrapiSessionJwtMock.mockResolvedValue('jwt')
    getCurrentStrapiUserMock.mockResolvedValue({ id: 1 })

    const payload = {
      data: {
        documentId: 'watch_captioned_image',
        reference: 'MGP1000',
        customer: { id: 1 },
        dateReception: '2026-04-14',
        dateMiseEnVente: '2026-04-24',
        publicBeforeImage: [],
        publicAfterImage: [],
        product: { name: 'Europ Union' },
        dossierBlocks: [
          {
            __component: 'watch-file.text-image-block',
            id: 1,
            title: 'Bloc image',
            imagePosition: 'right',
            content: [],
            images: [
              {
                url: '/dossier-image.jpg',
                caption: 'Legende test',
              },
            ],
          },
        ],
      },
    }

    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify(payload), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(payload), { status: 200 })
      )

    const res = await GET({} as NextRequest, {
      params: Promise.resolve({ id: 'watch_captioned_image' }),
    })

    expect(res.status).toBe(200)

    const documentElement = renderToBufferMock.mock.calls[0]?.[0]
    const renderedDocument = (documentElement as PdfDocumentElement).type(
      (documentElement as PdfDocumentElement).props
    )
    const views = collectElementsByType(renderedDocument, 'View')
    const imageWithCaptionView = views.find((view) => {
      const children = toPdfTestNodes(view.props?.children)

      return (
        view.props?.wrap === false &&
        view.props?.minPresenceAhead === 12 &&
        children.some(
          (child) =>
            child?.type === 'Text' && child?.props?.children === 'Legende test'
        ) &&
        children.some((child) => {
          const grandChildren = toPdfTestNodes(child.props?.children)

          return grandChildren.some((grandChild) => grandChild.type === 'Image')
        })
      )
    })

    expect(imageWithCaptionView).toBeTruthy()
  })

  it('keeps each before-after pair on the same page container', async () => {
    getStrapiSessionJwtMock.mockResolvedValue('jwt')
    getCurrentStrapiUserMock.mockResolvedValue({ id: 1 })

    const payload = {
      data: {
        documentId: 'watch_before_after_pair',
        reference: 'MGP1001',
        customer: { id: 1 },
        dateReception: '2026-04-14',
        dateMiseEnVente: '2026-04-24',
        publicBeforeImage: [],
        publicAfterImage: [],
        product: { name: 'Europ Union' },
        dossierBlocks: [
          {
            __component: 'watch-file.before-after-block',
            id: 1,
            title: 'Bloc avant apres',
            content: [],
            pairs: [
              {
                label: 'Aiguilles',
                beforeImage: { url: '/before-aiguilles.jpg' },
                afterImage: { url: '/after-aiguilles.jpg' },
              },
            ],
          },
        ],
      },
    }

    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify(payload), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(payload), { status: 200 })
      )

    const res = await GET({} as NextRequest, {
      params: Promise.resolve({ id: 'watch_before_after_pair' }),
    })

    expect(res.status).toBe(200)

    const documentElement = renderToBufferMock.mock.calls[0]?.[0]
    const renderedDocument = (documentElement as PdfDocumentElement).type(
      (documentElement as PdfDocumentElement).props
    )
    const views = collectElementsByType(renderedDocument, 'View')
    const pairContainer = views.find((view) => {
      const children = toPdfTestNodes(view.props?.children)

      return (
        view.props?.wrap === false &&
        view.props?.minPresenceAhead === 24 &&
        children.some(
          (child) =>
            child?.type === 'Text' && child?.props?.children === 'Aiguilles'
        )
      )
    })

    expect(pairContainer).toBeTruthy()
  })
})
