import { describe, expect, it } from 'vitest'

import { buildBoutiqueListing, normalizeContainerWidth } from './page'

const products = [
  {
    id: 1,
    documentId: 'prod_1',
    name: 'Omega Vintage',
    slug: 'omega-vintage',
    shortDescription: 'Montre revisee',
    badges: ['Rare'],
    price: 1200,
    compareAtPrice: null,
    active: true,
    images: null,
    category: { id: 10, documentId: 'cat_1', name: 'Vintage', slug: 'vintage' },
    conditionRatings: [{ label: 'cadran', value: 85, note: 'Tres bon' }],
  },
  {
    id: 2,
    documentId: 'prod_2',
    name: 'Rolex Atelier',
    slug: 'rolex-atelier',
    shortDescription: 'Piece a restaurer',
    badges: ['Atelier'],
    price: 800,
    compareAtPrice: null,
    active: true,
    images: null,
    category: { id: 11, documentId: 'cat_2', name: 'Atelier', slug: 'atelier' },
    conditionRatings: [{ label: 'boitier', value: 35, note: 'Use' }],
  },
  {
    id: 3,
    documentId: 'prod_3',
    name: 'Cartier Classique',
    slug: 'cartier-classique',
    shortDescription: 'Excellent etat',
    badges: ['Selection'],
    price: 2200,
    compareAtPrice: null,
    active: true,
    images: null,
    category: {
      id: 10,
      documentId: 'cat_1b',
      name: 'Vintage',
      slug: 'vintage',
    },
    conditionRatings: [{ label: 'mouvement', value: 92, note: 'Excellent' }],
  },
] as const

describe('normalizeContainerWidth', () => {
  it('keeps supported widths and falls back to medium', () => {
    expect(normalizeContainerWidth('full')).toBe('full')
    expect(normalizeContainerWidth('weird')).toBe('medium')
  })
})

describe('buildBoutiqueListing', () => {
  it('filters by category, query, condition and sort order', () => {
    const listing = buildBoutiqueListing(products as never, {
      categorie: 'vintage',
      q: 'cartier',
      etat: 'excellent',
      tri: 'prix-desc',
    })

    expect(listing.totalProducts).toBe(1)
    expect(listing.paginated.map((product) => product.slug)).toEqual([
      'cartier-classique',
    ])
  })

  it('computes categories, price bounds and safe pagination', () => {
    const listing = buildBoutiqueListing(products as never, { page: '9' }, 2)

    expect(listing.categories.map((category) => category.slug)).toEqual([
      'vintage',
      'atelier',
    ])
    expect(listing.catalogueMin).toBe(800)
    expect(listing.catalogueMax).toBe(2200)
    expect(listing.pageCount).toBe(2)
    expect(listing.safePage).toBe(2)
    expect(listing.paginated.map((product) => product.slug)).toEqual([
      'cartier-classique',
    ])
  })

  it('filters by price range and ascending sort', () => {
    const listing = buildBoutiqueListing(products as never, {
      prixMin: '900',
      prixMax: '2500',
      tri: 'prix-asc',
    })

    expect(listing.paginated.map((product) => product.slug)).toEqual([
      'omega-vintage',
      'cartier-classique',
    ])
  })
})
