import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  revalidatePathMock,
  revalidateTagMock,
  validateStripeWebhookSignatureMock,
  checkRateLimitMock,
} = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  revalidateTagMock: vi.fn(),
  validateStripeWebhookSignatureMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
}))

vi.mock('@/lib/webhook-validation', () => ({
  validateStripeWebhookSignature: validateStripeWebhookSignatureMock,
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
}))

import { POST } from './route'

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_STRAPI_URL = 'http://strapi.test'
    process.env.STRAPI_WRITE_API_TOKEN = 'write-token'
    delete process.env.STRAPI_WEBHOOK_ERROR_COLLECTION
    vi.restoreAllMocks()
    revalidatePathMock.mockReset()
    revalidateTagMock.mockReset()
    validateStripeWebhookSignatureMock.mockReset()
    checkRateLimitMock.mockReset()
    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 0,
      resetAt: Date.now() + 1000,
      source: 'memory',
    })
  })

  it('returns 400 when stripe-signature header is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when signature validation fails', async () => {
    validateStripeWebhookSignatureMock.mockImplementation(() => {
      throw new Error('invalid signature')
    })

    const req = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 'sig_bad',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ id: 'evt_bad' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(revalidatePathMock).not.toHaveBeenCalled()
    expect(revalidateTagMock).not.toHaveBeenCalled()
  })

  it('returns 200 for unhandled event types', async () => {
    validateStripeWebhookSignatureMock.mockReturnValue({
      id: 'evt_123',
      type: 'customer.created',
      data: { object: {} },
    })

    const req = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 'sig_ok',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ id: 'evt_123' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(revalidatePathMock).not.toHaveBeenCalled()
    expect(revalidateTagMock).not.toHaveBeenCalled()
  })

  it('returns 200 and skips processing when event id is duplicated', async () => {
    checkRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 1000,
      source: 'memory',
    })

    validateStripeWebhookSignatureMock.mockReturnValue({
      id: 'evt_duplicate',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_dup',
          payment_status: 'paid',
          metadata: {
            locale: 'fr',
            cartItems: JSON.stringify([]),
          },
        },
      },
    })

    const fetchSpy = vi.spyOn(global, 'fetch')

    const req = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 'sig_ok',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ id: 'evt_duplicate' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
    expect(revalidateTagMock).not.toHaveBeenCalled()
  })

  it('is idempotent when order already exists for a paid checkout session', async () => {
    validateStripeWebhookSignatureMock.mockReturnValue({
      id: 'evt_paid_duplicate',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          payment_status: 'paid',
          metadata: {
            locale: 'fr',
            cartItems: JSON.stringify([
              { id: 1, documentId: 'prod_1', slug: 'montre-test', quantity: 1 },
            ]),
          },
        },
      },
    })

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ documentId: 'order_existing_1' }],
        }),
        { status: 200 }
      )
    )

    const req = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 'sig_ok',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ id: 'evt_paid_duplicate' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/orders'),
      expect.objectContaining({ cache: 'no-store' })
    )
    expect(revalidatePathMock).not.toHaveBeenCalled()
    expect(revalidateTagMock).not.toHaveBeenCalled()
  })

  it('persists processing errors to Strapi and returns 500', async () => {
    process.env.STRAPI_WEBHOOK_ERROR_COLLECTION = 'webhook-errors'

    validateStripeWebhookSignatureMock.mockReturnValue({
      id: 'evt_processing_error',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_fail',
          payment_status: 'paid',
          shipping_cost: { amount_total: 0 },
          customer_details: { email: 'a@b.com', name: 'Test User' },
          metadata: {
            locale: 'fr',
            cartItems: JSON.stringify([
              {
                id: 1,
                name: 'Montre',
                slug: 'montre',
                price: 100,
                quantity: 1,
              },
            ]),
          },
        },
      },
    })

    const fetchSpy = vi
      .spyOn(global, 'fetch')
      // Pre-check for existing order: none found.
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      )
      // Order creation fails -> should enter catch.
      .mockResolvedValueOnce(new Response('boom', { status: 500 }))
      // Error persistence should be attempted.
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: 1 } }), { status: 200 })
      )

    const req = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 'sig_ok',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ id: 'evt_processing_error' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
    expect(fetchSpy).toHaveBeenCalledTimes(3)
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('/api/webhook-errors'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})
