import { describe, expect, it, vi } from 'vitest'

import { submitServiceRequest } from './NouvelleDemandeForm'

describe('submitServiceRequest', () => {
  const payload = {
    type: 'reparation' as const,
    watch_file_document_id: 'watch_1',
    description: 'La montre s arrete au bout de quelques heures.',
  }

  it('returns success for a successful submission', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true })

    await expect(
      submitServiceRequest(payload, fetchImpl as typeof fetch)
    ).resolves.toEqual({ ok: true, error: null })
  })

  it('surfaces the api error when available', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'Demande invalide.' }),
    })

    await expect(
      submitServiceRequest(payload, fetchImpl as typeof fetch)
    ).resolves.toEqual({ ok: false, error: 'Demande invalide.' })
  })

  it('falls back to the default error when the body is invalid', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockRejectedValue(new Error('invalid json')),
    })

    await expect(
      submitServiceRequest(payload, fetchImpl as typeof fetch)
    ).resolves.toEqual({
      ok: false,
      error: 'Erreur lors de la soumission.',
    })
  })

  it('falls back to the default error when fetch throws', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network'))

    await expect(
      submitServiceRequest(payload, fetchImpl as typeof fetch)
    ).resolves.toEqual({
      ok: false,
      error: 'Erreur lors de la soumission.',
    })
  })
})
