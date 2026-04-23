import { describe, expect, it } from 'vitest'

import {
  buildHomeImagePreloadLinks,
  getSharedOpeningDays,
  normalizeContainerWidth,
} from './page'

describe('getSharedOpeningDays', () => {
  it('returns the first text-map opening days found in sections', () => {
    expect(
      getSharedOpeningDays([
        { blocks: [{ __component: 'blocks.hero', openingDays: [] }] },
        {
          blocks: [
            {
              __component: 'blocks.text-map-block',
              openingDays: [
                { dayLabel: 'Lundi', firstPeriodOpenTime: '09:00' },
              ],
            },
          ],
        },
      ])
    ).toEqual([{ dayLabel: 'Lundi', firstPeriodOpenTime: '09:00' }])
  })

  it('returns an empty array when no text-map opening days exist', () => {
    expect(
      getSharedOpeningDays([{ blocks: [{ __component: 'blocks.hero' }] }])
    ).toEqual([])
  })
})

describe('normalizeContainerWidth', () => {
  it('keeps supported container widths', () => {
    expect(normalizeContainerWidth('small')).toBe('small')
    expect(normalizeContainerWidth('medium')).toBe('medium')
    expect(normalizeContainerWidth('large')).toBe('large')
    expect(normalizeContainerWidth('full')).toBe('full')
  })

  it('falls back to medium for unsupported values', () => {
    expect(normalizeContainerWidth('wide')).toBe('medium')
    expect(normalizeContainerWidth(null)).toBe('medium')
  })
})

describe('buildHomeImagePreloadLinks', () => {
  it('builds preload links for relative and absolute image urls', () => {
    expect(
      buildHomeImagePreloadLinks('http://localhost:1337', [
        '/uploads/hero.jpg',
        'https://cdn.example.com/carousel.jpg',
      ])
    ).toEqual([
      {
        rel: 'preload',
        href: 'http://localhost:1337/uploads/hero.jpg',
        as: 'image',
        fetchpriority: 'high',
      },
      {
        rel: 'preload',
        href: 'https://cdn.example.com/carousel.jpg',
        as: 'image',
        fetchpriority: 'high',
      },
    ])
  })

  it('ignores missing image urls', () => {
    expect(
      buildHomeImagePreloadLinks('http://localhost:1337', [
        undefined,
        undefined,
      ])
    ).toEqual([])
  })
})
