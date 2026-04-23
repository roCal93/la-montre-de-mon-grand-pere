import { describe, expect, it } from 'vitest'

import {
  normalizeLocalesConfig,
  resolveCurrentLocale,
} from './LanguageSwitcher'

describe('normalizeLocalesConfig', () => {
  it('keeps only supported dynamic locales', () => {
    expect(
      normalizeLocalesConfig({
        locales: ['en', 'de', 'fr'],
        defaultLocale: 'en',
      })
    ).toEqual({
      supportedLocales: ['en', 'fr'],
      defaultLocale: 'en',
    })
  })

  it('falls back to static locales when dynamic locales are empty or invalid', () => {
    expect(
      normalizeLocalesConfig({ locales: ['de'], defaultLocale: 'de' })
    ).toEqual({
      supportedLocales: ['fr', 'en'],
      defaultLocale: 'fr',
    })
  })

  it('falls back to the static default locale when the dynamic one is unsupported', () => {
    expect(
      normalizeLocalesConfig({ locales: ['fr', 'en'], defaultLocale: 'es' })
    ).toEqual({
      supportedLocales: ['fr', 'en'],
      defaultLocale: 'fr',
    })
  })
})

describe('resolveCurrentLocale', () => {
  it('uses the locale from the pathname when supported', () => {
    expect(resolveCurrentLocale('/en/produits', ['fr', 'en'], 'fr')).toBe('en')
  })

  it('falls back to the default locale when the path locale is unsupported', () => {
    expect(resolveCurrentLocale('/de/produits', ['fr', 'en'], 'fr')).toBe('fr')
  })
})
