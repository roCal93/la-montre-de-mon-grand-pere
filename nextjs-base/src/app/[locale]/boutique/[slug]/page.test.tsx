import { describe, expect, it } from 'vitest'

import {
  buildBeforeAfterPairs,
  buildProductBadges,
  buildProductImageUrl,
  buildGlobalConditionRows,
  buildPublicBadgeLabels,
  buildPublicRepairSummary,
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

describe('buildPublicBadgeLabels', () => {
  it('extracts non-empty labels from badge entries', () => {
    expect(
      buildPublicBadgeLabels([
        { label: 'Rare' },
        { label: '  Atelier  ' },
        { label: '' },
        { label: null },
      ])
    ).toEqual(['Rare', 'Atelier'])
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
        beforeWidth: undefined,
        beforeHeight: undefined,
        afterWidth: undefined,
        afterHeight: undefined,
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
        beforeWidth: undefined,
        beforeHeight: undefined,
        afterWidth: undefined,
        afterHeight: undefined,
      },
    ])

    expect(buildBeforeAfterPairs(null, null, 'http://localhost:1337')).toEqual(
      []
    )
  })
})

describe('buildGlobalConditionRows', () => {
  it('builds the four summary rows and drops empty entries', () => {
    expect(
      buildGlobalConditionRows(
        {
          etatGeneralGlobal: {
            boitier: { pourcentage: 85, commentaire: 'Très bon' },
            cadran: { pourcentage: 72, commentaire: 'Patine homogène' },
            mouvement: { pourcentage: 92, commentaire: 'Révisé' },
            bracelet: { pourcentage: null, commentaire: null },
          },
          fonctionnementAvantIntervention: null,
          etatVisuelComposants: null,
        },
        'fr'
      )
    ).toEqual([
      {
        key: 'boitier',
        label: 'Boîtier',
        percentage: 85,
        comment: 'Très bon',
      },
      {
        key: 'cadran',
        label: 'Cadran',
        percentage: 72,
        comment: 'Patine homogène',
      },
      {
        key: 'mouvement',
        label: 'Mouvement',
        percentage: 92,
        comment: 'Révisé',
      },
    ])
  })

  it('clamps percentages and keeps a text-only entry', () => {
    expect(
      buildGlobalConditionRows(
        {
          etatGeneralGlobal: {
            boitier: { pourcentage: 140, commentaire: 'Exceptionnel' },
            cadran: { pourcentage: -10, commentaire: null },
            mouvement: null,
            bracelet: { pourcentage: null, commentaire: 'Neuf' },
          },
          fonctionnementAvantIntervention: null,
          etatVisuelComposants: null,
        },
        'fr'
      )
    ).toEqual([
      {
        key: 'boitier',
        label: 'Boîtier',
        percentage: 100,
        comment: 'Exceptionnel',
      },
      {
        key: 'cadran',
        label: 'Cadran',
        percentage: 0,
        comment: null,
      },
      {
        key: 'bracelet',
        label: 'Bracelet',
        percentage: 0,
        comment: 'Neuf',
      },
    ])
  })
})

describe('buildPublicRepairSummary', () => {
  it('splits the public summary by line and removes empty entries', () => {
    expect(
      buildPublicRepairSummary(
        'Revision complete du mouvement\n\nRemplacement des joints\nPolissage leger du boitier'
      )
    ).toEqual([
      'Revision complete du mouvement',
      'Remplacement des joints',
      'Polissage leger du boitier',
    ])
  })
})
