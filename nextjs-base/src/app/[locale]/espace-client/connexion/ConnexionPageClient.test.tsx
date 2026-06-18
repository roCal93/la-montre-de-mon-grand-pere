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
    // Other locale paths are now allowed (same site, just different locale)
    expect(resolvePostLoginPath('fr', '/en/espace-client/commandes')).toBe(
      '/en/espace-client/commandes'
    )
    // Boutique paths are now allowed so users return to the watch they were viewing
    expect(resolvePostLoginPath('fr', '/fr/boutique')).toBe('/fr/boutique')
  })

  it('rejects external and protocol-relative URLs', () => {
    expect(resolvePostLoginPath('fr', 'https://evil.com')).toBe(
      '/fr/espace-client/tableau-de-bord'
    )
    expect(resolvePostLoginPath('fr', '//evil.com/path')).toBe(
      '/fr/espace-client/tableau-de-bord'
    )
  })
})
