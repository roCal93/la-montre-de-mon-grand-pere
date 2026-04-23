import { describe, expect, it } from 'vitest'

import { resolvePostLoginPath } from './ConnexionPageClient'

describe('resolvePostLoginPath', () => {
  it('falls back to dashboard when from is missing', () => {
    expect(resolvePostLoginPath('fr', null)).toBe(
      '/fr/espace-client/tableau-de-bord'
    )
  })

  it('keeps a safe espace-client destination', () => {
    expect(resolvePostLoginPath('fr', '/fr/espace-client/commandes')).toBe(
      '/fr/espace-client/commandes'
    )
  })

  it('rejects auth pages as redirect targets', () => {
    expect(resolvePostLoginPath('fr', '/fr/espace-client/connexion')).toBe(
      '/fr/espace-client/tableau-de-bord'
    )
    expect(resolvePostLoginPath('fr', '/fr/espace-client/inscription')).toBe(
      '/fr/espace-client/tableau-de-bord'
    )
    expect(
      resolvePostLoginPath('fr', '/fr/espace-client/mot-de-passe-oublie')
    ).toBe('/fr/espace-client/tableau-de-bord')
  })

  it('rejects paths outside the current locale espace-client area', () => {
    expect(resolvePostLoginPath('fr', '/en/espace-client/commandes')).toBe(
      '/fr/espace-client/tableau-de-bord'
    )
    expect(resolvePostLoginPath('fr', '/fr/boutique')).toBe(
      '/fr/espace-client/tableau-de-bord'
    )
  })
})
