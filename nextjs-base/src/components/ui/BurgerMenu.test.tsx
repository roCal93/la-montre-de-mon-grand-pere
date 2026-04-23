import { describe, expect, it } from 'vitest'

import {
  getBurgerAccountOffsetClass,
  getBurgerMenuHref,
  isBurgerMenuLinkActive,
} from './BurgerMenu'

describe('getBurgerMenuHref', () => {
  it('builds a home href from the current locale', () => {
    expect(getBurgerMenuHref('fr', '', true)).toBe('/fr')
  })

  it('builds an anchored section href from the current locale', () => {
    expect(getBurgerMenuHref('fr', 'atelier', false, 'services')).toBe(
      '/fr/atelier#services'
    )
  })
})

describe('isBurgerMenuLinkActive', () => {
  it('marks a standard route active when pathname matches', () => {
    expect(
      isBurgerMenuLinkActive('/fr/atelier', '', 'fr', {
        slug: 'atelier',
        label: 'Atelier',
        isHome: false,
      })
    ).toBe(true)
  })

  it('marks an anchor route active only when both path and hash match', () => {
    expect(
      isBurgerMenuLinkActive('/fr', '#services', 'fr', {
        slug: '',
        label: 'Services',
        isHome: true,
        anchor: 'services',
      })
    ).toBe(true)

    expect(
      isBurgerMenuLinkActive('/fr', '', 'fr', {
        slug: '',
        label: 'Services',
        isHome: true,
        anchor: 'services',
      })
    ).toBe(false)
  })
})

describe('getBurgerAccountOffsetClass', () => {
  it('adds the translate class only when the language switcher is open', () => {
    expect(getBurgerAccountOffsetClass(false)).toBe(
      'transition-transform duration-200 '
    )
    expect(getBurgerAccountOffsetClass(true)).toBe(
      'transition-transform duration-200 -translate-x-4'
    )
  })
})
