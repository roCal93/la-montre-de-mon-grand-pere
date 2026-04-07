import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { revalidatePathMock, revalidateTagMock } = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  revalidateTagMock: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
}))

import { POST } from './route'

const OLD_SECRET = process.env.REVALIDATE_SECRET

describe('POST /api/revalidate', () => {
  beforeEach(() => {
    process.env.REVALIDATE_SECRET = 'test-secret'
    revalidatePathMock.mockReset()
    revalidateTagMock.mockReset()
  })

  afterEach(() => {
    process.env.REVALIDATE_SECRET = OLD_SECRET
  })

  it('rejects when secret is provided only in body', async () => {
    const req = new NextRequest('http://localhost:3000/api/revalidate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: 'test-secret', model: 'page' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    expect(revalidateTagMock).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('accepts valid x-webhook-secret header', async () => {
    const req = new NextRequest('http://localhost:3000/api/revalidate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-webhook-secret': 'test-secret',
      },
      body: JSON.stringify({
        model: 'page',
        entry: { slug: 'home', locale: 'fr' },
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(revalidateTagMock).toHaveBeenCalledWith('strapi-pages', {})
    expect(revalidatePathMock).toHaveBeenCalled()
  })
})
