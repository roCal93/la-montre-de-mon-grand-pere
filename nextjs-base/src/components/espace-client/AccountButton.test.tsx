import { describe, expect, it } from 'vitest'

import { resolveAccountButtonState } from './AccountButton'

describe('resolveAccountButtonState', () => {
  it('points unauthenticated users to the locale login page', () => {
    expect(resolveAccountButtonState('/fr', false)).toEqual({
      locale: 'fr',
      href: '/fr/espace-client/connexion',
      isCurrentHref: false,
    })
  })

  it('marks the login page as current for unauthenticated users', () => {
    expect(
      resolveAccountButtonState('/fr/espace-client/connexion', false)
    ).toEqual({
      locale: 'fr',
      href: '/fr/espace-client/connexion',
      isCurrentHref: true,
    })
  })

  it('points authenticated users to the locale dashboard', () => {
    expect(resolveAccountButtonState('/en/blog', true)).toEqual({
      locale: 'en',
      href: '/en/espace-client/tableau-de-bord',
      isCurrentHref: false,
    })
  })

  it('marks the dashboard as current for authenticated users', () => {
    expect(
      resolveAccountButtonState('/fr/espace-client/tableau-de-bord', true)
    ).toEqual({
      locale: 'fr',
      href: '/fr/espace-client/tableau-de-bord',
      isCurrentHref: true,
    })
  })
})
