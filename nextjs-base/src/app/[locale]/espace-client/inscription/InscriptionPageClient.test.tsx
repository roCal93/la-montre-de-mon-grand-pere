import { describe, expect, it, vi } from 'vitest'

import {
  createAccount,
  resolvePostRegisterPath,
} from './InscriptionPageClient'

describe('createAccount', () => {
  const payload = {
    username: 'Jean Dupont',
    email: 'jean@example.com',
    password: 'secret123',
  }

  it('fails fast when the local strapi url is missing', async () => {
    await expect(createAccount(payload, undefined)).resolves.toEqual({
      ok: false,
      error: 'Configuration locale manquante pour créer un compte.',
    })
  })

  it('returns success when registration succeeds', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true })

    await expect(
      createAccount(payload, 'http://localhost:1337', fetchImpl as typeof fetch)
    ).resolves.toEqual({ ok: true, error: null })
  })

  it('surfaces the api error message when registration fails', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({
        error: { message: 'Cet email est déjà utilisé.' },
      }),
    })

    await expect(
      createAccount(payload, 'http://localhost:1337', fetchImpl as typeof fetch)
    ).resolves.toEqual({
      ok: false,
      error: 'Cet email est déjà utilisé.',
    })
  })

  it('falls back cleanly when the response body is invalid or the request fails', async () => {
    const invalidJsonFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockRejectedValue(new Error('invalid json')),
    })

    await expect(
      createAccount(
        payload,
        'http://localhost:1337',
        invalidJsonFetch as typeof fetch
      )
    ).resolves.toEqual({
      ok: false,
      error: 'Erreur lors de la création du compte.',
    })

    const failingFetch = vi.fn().mockRejectedValue(new Error('network'))

    await expect(
      createAccount(
        payload,
        'http://localhost:1337',
        failingFetch as typeof fetch
      )
    ).resolves.toEqual({
      ok: false,
      error: 'Erreur lors de la création du compte.',
    })
  })
})

describe('resolvePostRegisterPath', () => {
  it('falls back to dashboard when from is missing', () => {
    expect(resolvePostRegisterPath('fr', null)).toBe(
      '/fr/espace-client/tableau-de-bord'
    )
  })

  it('accepts safe internal paths with query string', () => {
    expect(
      resolvePostRegisterPath(
        'fr',
        '/fr/espace-client/claim?token=abc.def'
      )
    ).toBe('/fr/espace-client/claim?token=abc.def')
  })

  it('rejects auth pages and external urls', () => {
    expect(resolvePostRegisterPath('fr', '/fr/espace-client/inscription')).toBe(
      '/fr/espace-client/tableau-de-bord'
    )
    expect(resolvePostRegisterPath('fr', 'https://evil.com')).toBe(
      '/fr/espace-client/tableau-de-bord'
    )
    expect(resolvePostRegisterPath('fr', '//evil.com/path')).toBe(
      '/fr/espace-client/tableau-de-bord'
    )
  })
})
