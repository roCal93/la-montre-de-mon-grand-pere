import { describe, expect, it } from 'vitest'

import {
  extractDescription,
  formatPublicationDate,
  normalizeContainerWidth,
} from './page'

describe('normalizeContainerWidth', () => {
  it('keeps supported widths and falls back to medium', () => {
    expect(normalizeContainerWidth('small')).toBe('small')
    expect(normalizeContainerWidth('unexpected')).toBe('medium')
  })
})

describe('extractDescription', () => {
  it('extracts text from rich seo description blocks', () => {
    expect(
      extractDescription([
        { children: [{ text: 'Premier bloc' }] },
        { children: [{ text: 'Second bloc' }] },
      ])
    ).toBe('Premier bloc Second bloc')
  })

  it('falls back to the provided excerpt when description is missing', () => {
    expect(extractDescription(null, 'Fallback excerpt')).toBe(
      'Fallback excerpt'
    )
  })
})

describe('formatPublicationDate', () => {
  it('returns null for missing or invalid dates', () => {
    expect(formatPublicationDate(undefined, 'fr')).toBeNull()
    expect(formatPublicationDate('not-a-date', 'fr')).toBeNull()
  })
})
