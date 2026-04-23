import { describe, expect, it, vi } from 'vitest'

import { requestPasswordReset } from './MotDePasseOubliePageClient'

describe('requestPasswordReset', () => {
  it('fails fast when the local strapi url is missing', async () => {
    await expect(
      requestPasswordReset('jean@example.com', undefined)
    ).resolves.toEqual({
      ok: false,
      error: 'Configuration locale manquante pour envoyer cet email.',
    })
  })

  it('returns success when the reset email request succeeds', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true })

    await expect(
      requestPasswordReset(
        'jean@example.com',
        'http://localhost:1337',
        fetchImpl as typeof fetch
      )
    ).resolves.toEqual({ ok: true, error: null })
  })

  it('falls back to the generic error when the api rejects the request', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false })

    await expect(
      requestPasswordReset(
        'jean@example.com',
        'http://localhost:1337',
        fetchImpl as typeof fetch
      )
    ).resolves.toEqual({
      ok: false,
      error: "Erreur lors de l'envoi. Vérifiez votre email.",
    })
  })

  it('falls back to the generic error when fetch throws', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network'))

    await expect(
      requestPasswordReset(
        'jean@example.com',
        'http://localhost:1337',
        fetchImpl as typeof fetch
      )
    ).resolves.toEqual({
      ok: false,
      error: "Erreur lors de l'envoi. Vérifiez votre email.",
    })
  })
})
