import { describe, expect, it } from 'vitest'

import {
  buildBeforeAfterPairs,
  buildProductBadges,
  buildProductImageUrl,
} from './page'

describe('buildProductImageUrl', () => {
  it('keeps absolute urls and prefixes relative ones', () => {
    expect(
      buildProductImageUrl('/uploads/watch.jpg', 'http://localhost:1337')
    ).toBe('http://localhost:1337/uploads/watch.jpg')
    expect(
      buildProductImageUrl(
        'https://cdn.example.com/watch.jpg',
        'http://localhost:1337'
      )
    ).toBe('https://cdn.example.com/watch.jpg')
  })
})

describe('buildProductBadges', () => {
  it('adds the unique-stock badge for available products', () => {
    expect(buildProductBadges(['Rare'], false, 'fr')).toEqual([
      { label: 'Rare' },
      { label: 'Stock unique', highlight: true },
    ])
  })

  it('adds the sold badge for sold products', () => {
    expect(buildProductBadges(null, true, 'en')).toEqual([{ label: 'Sold' }])
  })
})

describe('buildBeforeAfterPairs', () => {
  it('pairs before and after images up to the shortest list length', () => {
    expect(
      buildBeforeAfterPairs(
        [
          { id: 1, url: '/before-1.jpg', alternativeText: 'before 1' },
          { id: 2, url: '/before-2.jpg', alternativeText: 'before 2' },
        ],
        [{ id: 3, url: '/after-1.jpg', alternativeText: 'after 1' }],
        'http://localhost:1337'
      )
    ).toEqual([
      {
        beforeUrl: 'http://localhost:1337/before-1.jpg',
        afterUrl: 'http://localhost:1337/after-1.jpg',
        beforeAlt: 'before 1',
        afterAlt: 'after 1',
      },
    ])
  })

  it('supports single-image inputs and empty values', () => {
    expect(
      buildBeforeAfterPairs(
        { id: 1, url: '/before.jpg', alternativeText: null },
        { id: 2, url: '/after.jpg', alternativeText: null },
        'http://localhost:1337'
      )
    ).toEqual([
      {
        beforeUrl: 'http://localhost:1337/before.jpg',
        afterUrl: 'http://localhost:1337/after.jpg',
        beforeAlt: undefined,
        afterAlt: undefined,
      },
    ])

    expect(buildBeforeAfterPairs(null, null, 'http://localhost:1337')).toEqual(
      []
    )
  })
})
