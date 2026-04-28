import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getStrapiSessionJwtMock } = vi.hoisted(() => ({
  getStrapiSessionJwtMock: vi.fn(),
}))

vi.mock('@/lib/strapi-session-cookie', () => ({
  getStrapiSessionJwt: getStrapiSessionJwtMock,
}))

import { strapiAuthGet } from './strapi-auth-client'

describe('strapiAuthFetch', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_STRAPI_URL = 'http://strapi.test'
    getStrapiSessionJwtMock.mockReset()
    vi.restoreAllMocks()
  })

  it('returns a structured error when the Strapi fetch fails', async () => {
    getStrapiSessionJwtMock.mockResolvedValue('jwt')
    vi.spyOn(global, 'fetch').mockRejectedValue(new TypeError('fetch failed'))

    const result = await strapiAuthGet('/watch-files/watch_1')

    expect(result).toEqual({
      data: null,
      error: 'Erreur réseau Strapi: fetch failed',
      status: 503,
    })
  })
})
