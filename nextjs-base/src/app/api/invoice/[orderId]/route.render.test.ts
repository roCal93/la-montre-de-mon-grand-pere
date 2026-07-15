import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}))

vi.mock('@/auth', () => ({
  auth: authMock,
}))

vi.mock('@/lib/currency', () => ({
  formatPrice: (value: number) => `${value} EUR`,
}))

import { GET } from './route'

describe('GET /api/invoice/[orderId] real render', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_STRAPI_URL = 'http://strapi.test'
    process.env.STRAPI_API_TOKEN = 'token'
    process.env.COMPANY_NAME = 'Maison Test'
    process.env.COMPANY_ADDRESS = '12 rue des Tests\n75000 Paris'
    process.env.COMPANY_SIRET = '12345678900012'
    authMock.mockReset()
    vi.restoreAllMocks()
  })

  it('renders a PDF without throwing', async () => {
    authMock.mockResolvedValue({ user: { email: 'owner@example.com' } })
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              documentId: 'doc_12345678',
              order_status: 'paid',
              createdAt: '2026-04-07T10:00:00.000Z',
              customerEmail: 'owner@example.com',
              customerName: 'Owner',
              lineItems: [
                {
                  productName: 'Omega Seamaster',
                  productSlug: 'omega-seamaster',
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

    const res = await GET({} as NextRequest, {
      params: Promise.resolve({ orderId: 'doc_12345678' }),
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toContain(
      'facture-FAC-20260407-12345678.pdf'
    )
  })
})
