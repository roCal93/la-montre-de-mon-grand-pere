import { beforeEach, describe, expect, it, vi } from 'vitest'

const { nextAuthMock, checkRateLimitMock, credentialsSigninCtor, captured } =
  vi.hoisted(() => {
    class MockCredentialsSignin extends Error {}

    return {
      nextAuthMock: vi.fn((config: unknown) => {
        captured.config = config
        return {
          handlers: {},
          auth: vi.fn(),
          signIn: vi.fn(),
          signOut: vi.fn(),
        }
      }),
      checkRateLimitMock: vi.fn(),
      credentialsSigninCtor: MockCredentialsSignin,
      captured: { config: null as unknown },
    }
  })

vi.mock('next-auth', () => ({
  default: nextAuthMock,
  CredentialsSignin: credentialsSigninCtor,
}))

vi.mock('next-auth/providers/credentials', () => ({
  default: (options: unknown) => options,
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
}))

import './auth'

type AuthConfigShape = {
  providers: Array<{
    authorize: (credentials?: unknown, request?: Request) => Promise<unknown>
  }>
}

describe('auth credentials rate limit', () => {
  beforeEach(() => {
    checkRateLimitMock.mockReset()
    vi.restoreAllMocks()
  })

  it('blocks login when rate limit is exceeded', async () => {
    checkRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 1000,
      source: 'memory',
    })

    const config = captured.config as AuthConfigShape
    const authorize = config.providers[0].authorize

    await expect(
      authorize(
        { email: 'test@example.com', password: 'secret' },
        new Request('http://localhost:3000/api/auth/callback/credentials')
      )
    ).rejects.toBeInstanceOf(credentialsSigninCtor)

    expect(checkRateLimitMock).toHaveBeenCalledTimes(1)
  })

  it('normalizes email and forwards client IP in rate-limit key', async () => {
    process.env.NEXT_PUBLIC_STRAPI_URL = 'http://strapi.test'

    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetAt: Date.now() + 1000,
      source: 'memory',
    })

    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          jwt: 'jwt',
          user: {
            id: 1,
            documentId: 'doc_1',
            email: 'test@example.com',
            username: 'test',
          },
        }),
        { status: 200 }
      )
    )

    const config = captured.config as AuthConfigShape
    const authorize = config.providers[0].authorize

    await authorize(
      { email: '  TEST@Example.COM ', password: 'secret' },
      new Request('http://localhost:3000/api/auth/callback/credentials', {
        headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' },
      })
    )

    expect(checkRateLimitMock).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'auth:test@example.com:1.2.3.4' })
    )
    expect(global.fetch).toHaveBeenCalledWith(
      'http://strapi.test/api/auth/local',
      expect.objectContaining({
        body: JSON.stringify({
          identifier: 'test@example.com',
          password: 'secret',
        }),
      })
    )
  })
})
