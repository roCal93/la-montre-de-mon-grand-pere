import { describe, expect, it, vi } from 'vitest'

import { submitAccountRequest } from './ProfilPageClient'

describe('submitAccountRequest', () => {
  it('returns success for a successful response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true })

    await expect(
      submitAccountRequest(
        '/api/account/profile',
        { username: 'Jean' },
        'Erreur lors de la mise à jour.',
        fetchImpl as typeof fetch
      )
    ).resolves.toEqual({ ok: true, error: null })
  })

  it('surfaces the api error message when available', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'Email deja utilise.' }),
    })

    await expect(
      submitAccountRequest(
        '/api/account/profile',
        { email: 'test@example.com' },
        'Erreur lors de la mise à jour.',
        fetchImpl as typeof fetch
      )
    ).resolves.toEqual({ ok: false, error: 'Email deja utilise.' })
  })

  it('falls back to the default message when the error body is invalid', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockRejectedValue(new Error('invalid json')),
    })

    await expect(
      submitAccountRequest(
        '/api/account/password',
        { password: 'secret123' },
        'Erreur lors du changement de mot de passe.',
        fetchImpl as typeof fetch
      )
    ).resolves.toEqual({
      ok: false,
      error: 'Erreur lors du changement de mot de passe.',
    })
  })

  it('falls back to the default message when fetch throws', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network'))

    await expect(
      submitAccountRequest(
        '/api/account/password',
        { password: 'secret123' },
        'Erreur lors du changement de mot de passe.',
        fetchImpl as typeof fetch
      )
    ).resolves.toEqual({
      ok: false,
      error: 'Erreur lors du changement de mot de passe.',
    })
  })
})
