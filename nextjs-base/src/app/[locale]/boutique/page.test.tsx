import { describe, expect, it } from 'vitest'

import { buildBoutiqueListing, normalizeContainerWidth } from './page'

const products = [
  {
    id: 1,
    documentId: 'prod_1',
    name: 'Omega Vintage',
    slug: 'omega-vintage',
    price: 1200,
    compareAtPrice: null,
    active: true,
    images: null,
    category: { id: 10, documentId: 'cat_1', name: 'Vintage', slug: 'vintage' },
    watchFile: {
      marketingShortDescription: 'Montre revisee',
      publicBadges: [{ label: 'Rare' }],
      etatGeneral: {
        etatGeneralGlobal: {
          boitier: { pourcentage: 82 },
          cadran: { pourcentage: 88 },
          mouvement: { pourcentage: 91 },
          bracelet: { pourcentage: 78 },
        },
      },
    },
  },
  {
    id: 2,
    documentId: 'prod_2',
    name: 'Rolex Atelier',
    slug: 'rolex-atelier',
    price: 800,
    compareAtPrice: null,
    active: true,
    images: null,
    category: { id: 11, documentId: 'cat_2', name: 'Atelier', slug: 'atelier' },
    watchFile: {
      marketingShortDescription: 'Piece a restaurer',
      publicBadges: [{ label: 'Atelier' }],
      etatGeneral: {
        etatGeneralGlobal: {
          boitier: { pourcentage: 35 },
          cadran: { pourcentage: 30 },
          mouvement: { pourcentage: 40 },
          bracelet: { pourcentage: 32 },
        },
      },
    },
  },
  {
    id: 3,
    documentId: 'prod_3',
    name: 'Cartier Classique',
    slug: 'cartier-classique',
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
    watchFile: {
      marketingShortDescription: 'Excellent etat',
      publicBadges: [{ label: 'Selection' }],
      etatGeneral: {
        etatGeneralGlobal: {
          boitier: { pourcentage: 94 },
          cadran: { pourcentage: 93 },
          mouvement: { pourcentage: 92 },
          bracelet: { pourcentage: 90 },
        },
      },
    },
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

  it('searches through watch-file public marketing fields', () => {
    const listing = buildBoutiqueListing(products as never, {
      q: 'selection',
    })

    expect(listing.paginated.map((product) => product.slug)).toEqual([
      'cartier-classique',
    ])
  })
})
