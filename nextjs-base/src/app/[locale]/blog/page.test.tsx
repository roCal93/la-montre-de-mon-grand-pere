import { describe, expect, it } from 'vitest'

import {
  articleMatchesQuery,
  extractAllStrings,
  formatPublicationDate,
  normalizeContainerWidth,
  normalizeSearchText,
} from './page'

describe('normalizeContainerWidth', () => {
  it('keeps supported widths and falls back to medium', () => {
    expect(normalizeContainerWidth('large')).toBe('large')
    expect(normalizeContainerWidth('weird')).toBe('medium')
  })
})

describe('formatPublicationDate', () => {
  it('returns null for missing or invalid dates', () => {
    expect(formatPublicationDate(undefined, 'fr')).toBeNull()
    expect(formatPublicationDate('not-a-date', 'fr')).toBeNull()
  })
})

describe('normalizeSearchText', () => {
  it('normalizes accents and casing', () => {
    expect(normalizeSearchText('Révision À L Ancienne')).toBe(
      'revision a l ancienne'
    )
  })
})

describe('extractAllStrings', () => {
  it('collects nested strings without looping on circular references', () => {
    const value: Record<string, unknown> = {
      title: 'Omega',
      nested: ['atelier', { text: 'Revision' }],
    }
    value.self = value

    expect(extractAllStrings(value)).toEqual(['Omega', 'atelier', 'Revision'])
  })
})

describe('articleMatchesQuery', () => {
  const article = {
    title: 'Révision d une Omega vintage',
    excerpt: 'Guide complet de restauration',
    authorName: 'Jean Dupont',
    seoTitle: 'Omega restauree',
    categories: [{ name: 'Atelier' }],
    sections: [{ blocks: [{ text: 'Polissage et reparation du boitier' }] }],
    seoDescription: [{ children: [{ text: 'Article detaille' }] }],
  } as never

  it('matches normalized text across article fields', () => {
    expect(
      articleMatchesQuery(article, normalizeSearchText('réparation'))
    ).toBe(true)
    expect(articleMatchesQuery(article, normalizeSearchText('atelier'))).toBe(
      true
    )
  })

  it('returns false when the query is absent from all searchable fields', () => {
    expect(articleMatchesQuery(article, normalizeSearchText('cartier'))).toBe(
      false
    )
  })
})
