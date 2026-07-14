import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { getCurrentStrapiUserMock, verifyWatchClaimTokenMock } = vi.hoisted(
  () => ({
    getCurrentStrapiUserMock: vi.fn(),
    verifyWatchClaimTokenMock: vi.fn(),
  })
)

vi.mock('@/lib/strapi-session-cookie', () => ({
  getCurrentStrapiUser: getCurrentStrapiUserMock,
}))

vi.mock('@/lib/watch-claim-token', () => ({
  verifyWatchClaimToken: verifyWatchClaimTokenMock,
}))

import { POST } from './route'

const OLD_STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL
const OLD_STRAPI_TOKEN = process.env.STRAPI_API_TOKEN
const OLD_STRAPI_WRITE_TOKEN = process.env.STRAPI_WRITE_API_TOKEN
const OLD_ASSIGN_SECRET = process.env.CLAIM_ASSIGN_SECRET

describe('POST /api/watch-claim', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_STRAPI_URL = 'http://localhost:1337'
    process.env.STRAPI_API_TOKEN = 'api-token'
    process.env.STRAPI_WRITE_API_TOKEN = 'write-api-token'
    process.env.CLAIM_ASSIGN_SECRET = 'assign-secret'
    getCurrentStrapiUserMock.mockReset()
    verifyWatchClaimTokenMock.mockReset()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_STRAPI_URL = OLD_STRAPI_URL
    process.env.STRAPI_API_TOKEN = OLD_STRAPI_TOKEN
    process.env.STRAPI_WRITE_API_TOKEN = OLD_STRAPI_WRITE_TOKEN
    process.env.CLAIM_ASSIGN_SECRET = OLD_ASSIGN_SECRET
  })

  it('rejects unauthenticated users', async () => {
    getCurrentStrapiUserMock.mockResolvedValue(null)

    const req = new NextRequest('http://localhost:3000/api/watch-claim', {
      method: 'POST',
      body: JSON.stringify({ token: 'abc' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('claims watch file when token is valid and Strapi assignment succeeds', async () => {
    getCurrentStrapiUserMock.mockResolvedValue({
      id: 42,
      email: 'client@test.com',
    })
    verifyWatchClaimTokenMock.mockReturnValue({
      ok: true,
      watchFileDocumentId: 'wf_123',
      payload: {},
    })

    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, watchFileDocumentId: 'wf_123' }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      )
    )

    const req = new NextRequest('http://localhost:3000/api/watch-claim', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid.token' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      success: true,
      watchFileDocumentId: 'wf_123',
    })
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:1337/api/watch-files/assign-customer',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer write-api-token',
          'x-claim-assign-secret': 'assign-secret',
        }),
      })
    )
  })

  it('maps Strapi 403 to a clear diagnostic message', async () => {
    getCurrentStrapiUserMock.mockResolvedValue({
      id: 42,
      email: 'client@test.com',
    })
    verifyWatchClaimTokenMock.mockReturnValue({
      ok: true,
      watchFileDocumentId: 'wf_123',
      payload: {},
    })

    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Forbidden' } }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      })
    )

    const req = new NextRequest('http://localhost:3000/api/watch-claim', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid.token' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toEqual({
      error:
        'Accès Strapi refusé. Vérifiez STRAPI_WRITE_API_TOKEN et les droits de ce token.',
      code: 'strapi_forbidden',
    })
  })

  it('maps already assigned conflicts to 409', async () => {
    getCurrentStrapiUserMock.mockResolvedValue({
      id: 42,
      email: 'client@test.com',
    })
    verifyWatchClaimTokenMock.mockReturnValue({
      ok: true,
      watchFileDocumentId: 'wf_123',
      payload: {},
    })

    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, reason: 'already_assigned' }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      )
    )

    const req = new NextRequest('http://localhost:3000/api/watch-claim', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid.token' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({
      error: 'Cette montre est déjà associée à un autre compte.',
      code: 'already_assigned',
    })
  })
})
