import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const {
  checkRateLimitMock,
  enforcePublicApiOriginMock,
  getClientIpFromHeadersMock,
  getDefaultFromEmailMock,
  isEmailConfiguredMock,
  sendEmailMock,
} = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
  enforcePublicApiOriginMock: vi.fn(),
  getClientIpFromHeadersMock: vi.fn(),
  getDefaultFromEmailMock: vi.fn(),
  isEmailConfiguredMock: vi.fn(),
  sendEmailMock: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIpFromHeaders: getClientIpFromHeadersMock,
}))

vi.mock('@/lib/public-api-security', () => ({
  enforcePublicApiOrigin: enforcePublicApiOriginMock,
}))

vi.mock('@/lib/email-client', () => ({
  getDefaultFromEmail: getDefaultFromEmailMock,
  isEmailConfigured: isEmailConfiguredMock,
  sendEmail: sendEmailMock,
}))

import { POST } from './route'

describe('POST /api/contact', () => {
  beforeEach(() => {
    process.env.CONTACT_EMAIL = 'contact@example.com'
    process.env.COMPANY_NAME = 'Maison Test'

    checkRateLimitMock.mockReset()
    enforcePublicApiOriginMock.mockReset()
    getClientIpFromHeadersMock.mockReset()
    getDefaultFromEmailMock.mockReset()
    isEmailConfiguredMock.mockReset()
    sendEmailMock.mockReset()

    enforcePublicApiOriginMock.mockReturnValue(null)
    getClientIpFromHeadersMock.mockReturnValue('127.0.0.1')
    getDefaultFromEmailMock.mockReturnValue('noreply@example.com')
    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 2,
      resetAt: Date.now() + 60_000,
      source: 'memory',
    })
    isEmailConfiguredMock.mockReturnValue(true)
    sendEmailMock.mockResolvedValue('msg_123')
  })

  it('accepts honeypot submissions without sending email', async () => {
    const req = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Bot',
        email: 'bot@example.com',
        message: 'This looks valid enough',
        consent: true,
        website: 'https://spam.test',
      }),
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ message: 'Message envoyé avec succès !' })
    expect(checkRateLimitMock).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('returns 429 with rate-limit headers when too many requests are made', async () => {
    checkRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 120_000,
      source: 'memory',
    })

    const req = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Jean',
        email: 'jean@example.com',
        message: 'Bonjour, je souhaite des informations.',
        consent: true,
      }),
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(429)
    expect(json.error).toContain('Trop de tentatives')
    expect(res.headers.get('X-RateLimit-Limit')).toBe('3')
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(res.headers.get('X-RateLimit-Source')).toBe('memory')
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('returns 200 in demo mode when email sending is not configured', async () => {
    isEmailConfiguredMock.mockReturnValue(false)

    const req = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Jean',
        email: 'jean@example.com',
        message: 'Bonjour, je souhaite des informations.',
        consent: true,
        locale: 'fr',
      }),
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('sends both contact and confirmation emails for a valid request', async () => {
    const req = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Jean <ami>',
        email: 'jean@example.com',
        message: 'Bonjour, je souhaite des informations détaillées.',
        consent: true,
        locale: 'en',
      }),
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({
      message: 'Message envoyé avec succès !',
      id: 'msg_123',
    })
    expect(sendEmailMock).toHaveBeenCalledTimes(2)
    expect(sendEmailMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        from: 'noreply@example.com',
        to: 'contact@example.com',
        replyTo: 'jean@example.com',
        subject: 'Nouveau message de contact de Jean &lt;ami&gt;',
      })
    )
    expect(sendEmailMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        from: 'Maison Test <noreply@example.com>',
        to: 'jean@example.com',
        subject: 'Confirmation of receipt of your message',
      })
    )
  })

  it('returns the origin error response when public api origin validation fails', async () => {
    enforcePublicApiOriginMock.mockReturnValue(
      NextResponse.json({ error: 'Forbidden origin' }, { status: 403 })
    )

    const req = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })

    const res = await POST(req)

    expect(res.status).toBe(403)
    expect(checkRateLimitMock).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})
