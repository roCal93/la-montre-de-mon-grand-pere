import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  getCurrentStrapiUserMock,
  isAdminUserMock,
  buildWatchClaimUrlMock,
  qrToDataUrlMock,
} = vi.hoisted(() => ({
  getCurrentStrapiUserMock: vi.fn(),
  isAdminUserMock: vi.fn(),
  buildWatchClaimUrlMock: vi.fn(),
  qrToDataUrlMock: vi.fn(),
}))

vi.mock('@/lib/strapi-session-cookie', () => ({
  getCurrentStrapiUser: getCurrentStrapiUserMock,
}))

vi.mock('@/lib/is-admin-user', () => ({
  isAdminUser: isAdminUserMock,
}))

vi.mock('@/lib/watch-claim-url', () => ({
  buildWatchClaimUrl: buildWatchClaimUrlMock,
}))

vi.mock('qrcode', () => ({
  default: {
    toDataURL: qrToDataUrlMock,
  },
}))

import { GET } from './route'

describe('GET /api/watch-claim/qr', () => {
  beforeEach(() => {
    getCurrentStrapiUserMock.mockReset()
    isAdminUserMock.mockReset()
    buildWatchClaimUrlMock.mockReset()
    qrToDataUrlMock.mockReset()
  })

  it('returns 401 when user is not authenticated', async () => {
    getCurrentStrapiUserMock.mockResolvedValue(null)

    const req = new NextRequest('http://localhost:3000/api/watch-claim/qr')
    const res = await GET(req)

    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    getCurrentStrapiUserMock.mockResolvedValue({ id: 1, email: 'x@test.com' })
    isAdminUserMock.mockReturnValue(false)

    const req = new NextRequest(
      'http://localhost:3000/api/watch-claim/qr?watchFileDocumentId=wf_1'
    )
    const res = await GET(req)

    expect(res.status).toBe(403)
  })

  it('returns png response for admin users', async () => {
    getCurrentStrapiUserMock.mockResolvedValue({
      id: 1,
      email: 'admin@test.com',
    })
    isAdminUserMock.mockReturnValue(true)
    buildWatchClaimUrlMock.mockReturnValue(
      'https://site.test/fr/espace-client/claim?token=abc'
    )
    qrToDataUrlMock.mockResolvedValue('data:image/png;base64,AQID')

    const req = new NextRequest(
      'http://localhost:3000/api/watch-claim/qr?watchFileDocumentId=wf_1&locale=fr'
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/png')
    expect(buildWatchClaimUrlMock).toHaveBeenCalledWith('wf_1', 'fr')
    expect(qrToDataUrlMock).toHaveBeenCalled()
  })
})
