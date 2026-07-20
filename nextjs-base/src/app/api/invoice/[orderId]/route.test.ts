import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, renderToBufferMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  renderToBufferMock: vi.fn(),
}))

vi.mock('@/auth', () => ({
  auth: authMock,
}))

vi.mock('@/lib/currency', () => ({
  formatPrice: (value: number) => `${value} EUR`,
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

function collectPdfText(node: unknown): string[] {
  if (node == null || typeof node === 'boolean') return []
  if (typeof node === 'string' || typeof node === 'number')
    return [String(node)]
  if (Array.isArray(node)) return node.flatMap((child) => collectPdfText(child))
  if (typeof node === 'object') {
    return collectPdfText(
      (node as { props?: { children?: unknown } }).props?.children
    )
  }
  return []
}

describe('GET /api/invoice/[orderId]', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_STRAPI_URL = 'http://strapi.test'
    process.env.STRAPI_API_TOKEN = 'token'
    process.env.COMPANY_NAME = 'Maison Test'
    process.env.COMPANY_ADDRESS = '12 rue des Tests\n75000 Paris'
    process.env.COMPANY_SIRET = '12345678900012'
    process.env.COMPANY_OWNER_NAME = 'Romain Calmelet'
    process.env.COMPANY_LEGAL_STATUS = 'Auto-entrepreneur / Micro-entreprise'
    process.env.COMPANY_EMAIL = 'contact@lamontredemongrandpere.com'
    process.env.COMPANY_WEBSITE = 'www.lamontredemongrandpere.com'
    process.env.COMPANY_PAYMENT_METHOD_LABEL = 'Stripe (Carte bancaire)'
    authMock.mockReset()
    renderToBufferMock.mockReset()
    renderToBufferMock.mockResolvedValue(new Uint8Array([1, 2, 3]))
    vi.restoreAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    authMock.mockResolvedValue(null)

    const res = await GET(new NextRequest('http://localhost/'), {
      params: Promise.resolve({ orderId: 'ord_1' }),
    })

    expect(res.status).toBe(401)
  })

  it('returns 403 when order does not belong to authenticated user', async () => {
    authMock.mockResolvedValue({ user: { email: 'owner@example.com' } })
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    )

    const res = await GET(new NextRequest('http://localhost/'), {
      params: Promise.resolve({ orderId: 'ord_2' }),
    })

    expect(res.status).toBe(403)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        'filters[customerEmail][$eqi]=owner%40example.com'
      ),
      expect.any(Object)
    )
  })

  it('returns a PDF response when order belongs to authenticated user', async () => {
    authMock.mockResolvedValue({ user: { email: 'owner@example.com' } })
    let renderedDocument: unknown
    renderToBufferMock.mockImplementation(async (pdfDocument: unknown) => {
      renderedDocument = (
        pdfDocument as { type: (props: unknown) => unknown }
      ).type((pdfDocument as { props: unknown }).props)
      return new Uint8Array([1, 2, 3])
    })
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              documentId: 'doc_12345678',
              order_status: 'commande_confirmee',
              createdAt: '2026-04-07T10:00:00.000Z',
              customerEmail: 'owner@example.com',
              customerName: 'Owner',
              lineItems: [
                {
                  productName: 'Omega Seamaster',
                  productSlug: 'lmgp-00027',
                  quantity: 1,
                  unitPrice: 10,
                  total: 10,
                },
              ],
              shippingAddress: {
                firstName: 'Owner',
                lastName: 'User',
                address1: '1 rue test',
                city: 'Paris',
                postalCode: '75001',
                country: 'FR',
              },
              subtotal: 10,
              shippingCost: 0,
              total: 10,
            },
          ],
        }),
        { status: 200 }
      )
    )

    const res = await GET(new NextRequest('http://localhost/'), {
      params: Promise.resolve({ orderId: 'doc_12345678' }),
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toBe(
      'attachment; filename="facture-FAC-20260407-12345678.pdf"'
    )
    expect(renderToBufferMock).toHaveBeenCalledTimes(1)

    const pdfText = collectPdfText(renderedDocument).join(' ')
    expect(pdfText).toContain('12 rue des Tests')
    expect(pdfText).toContain('SIRET : 12345678900012')
    expect(pdfText).toContain('Responsable : Romain Calmelet')
    expect(pdfText).toContain('N° FAC-20260407-12345678')
    expect(pdfText).toContain('FACTURE')
    expect(pdfText).toContain('Réf. commande : #12345678')
    expect(pdfText).toContain('Paiement : Stripe (Carte bancaire)')
    expect(pdfText).toContain('Date de règlement : 7 avril 2026')
    expect(pdfText).toContain('Owner User')
    expect(pdfText).toContain('owner@example.com')
    expect(pdfText).toContain('Omega Seamaster')
    expect(pdfText).toContain('Référence interne : LMGP-00027')
    expect(pdfText).toContain('TVA non applicable, art. 293 B du CGI')
    expect(pdfText).toContain('www.lamontredemongrandpere.com')
    expect(pdfText).toContain('contact@lamontredemongrandpere.com')
  })

  it('returns a precise config error when issuer identity is missing', async () => {
    authMock.mockResolvedValue({ user: { email: 'owner@example.com' } })
    delete process.env.COMPANY_ADDRESS
    delete process.env.COMPANY_SIRET
    renderToBufferMock.mockImplementation(async (pdfDocument: unknown) => {
      ;(pdfDocument as { type: (props: unknown) => unknown }).type(
        (pdfDocument as { props: unknown }).props
      )
      return new Uint8Array([1, 2, 3])
    })
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              documentId: 'doc_12345678',
              status: 'paid',
              createdAt: '2026-04-07T10:00:00.000Z',
              customerEmail: 'owner@example.com',
              customerName: 'Owner',
              lineItems: [],
              shippingAddress: {
                firstName: 'Owner',
                lastName: 'User',
                address1: '1 rue test',
                city: 'Paris',
                postalCode: '75001',
                country: 'FR',
              },
              subtotal: 10,
              shippingCost: 0,
              total: 10,
            },
          ],
        }),
        { status: 200 }
      )
    )

    const res = await GET(new NextRequest('http://localhost/'), {
      params: Promise.resolve({ orderId: 'doc_12345678' }),
    })

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({
      error: 'Configuration facture manquante',
      missing: ['COMPANY_ADDRESS', 'COMPANY_SIRET'],
    })
  })
})
