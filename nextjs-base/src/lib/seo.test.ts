import { describe, it, expect } from 'vitest'
import { buildMetadata } from './seo'

describe('buildMetadata', () => {
  it('builds basic metadata', () => {
    const result = buildMetadata({
      title: 'Test Title',
      description: 'Test Description',
      url: 'https://example.com',
    })

    expect(result.title).toBe('Test Title')
    expect(result.description).toBe('Test Description')
    expect(result.robots).toBe('index, follow')
    expect(result.alternates?.canonical).toBe('https://example.com')
    expect(result.openGraph?.title).toBe('Test Title')
    expect(result.openGraph?.url).toBe('https://example.com')
    expect(result.twitter?.title).toBe('Test Title')
  })

  it('handles noIndex', () => {
    const result = buildMetadata({
      title: 'Test',
      noIndex: true,
    })

    expect(result.robots).toBe('noindex, nofollow')
  })

  it('handles alternates', () => {
    const result = buildMetadata({
      title: 'Test',
      alternates: [
        { hreflang: 'en', href: 'https://example.com/en' },
        { hreflang: 'fr', href: 'https://example.com/fr' },
      ],
    })

    expect(result.alternates?.languages).toEqual({
      en: 'https://example.com/en',
      fr: 'https://example.com/fr',
    })
  })

  it('handles image', () => {
    const result = buildMetadata({
      title: 'Test',
      image: 'https://example.com/image.jpg',
    })

    // openGraph.images can be an object or an array; normalize to array for assertions
    const ogImages = Array.isArray(result.openGraph?.images)
      ? result.openGraph?.images
      : result.openGraph?.images
        ? [result.openGraph?.images]
        : []

    type OgImage = string | { url?: string; width?: number; height?: number }
    const firstOg = ogImages[0] as OgImage | undefined

    const isOgImageObject = (
      v: unknown
    ): v is { url?: string; width?: number; height?: number } =>
      typeof v === 'object' && v !== null

    const ogUrl =
      typeof firstOg === 'string'
        ? firstOg
        : isOgImageObject(firstOg)
          ? firstOg.url
          : undefined
    expect(ogUrl).toBe('https://example.com/image.jpg')

    if (isOgImageObject(firstOg)) {
      expect(firstOg.width).toBe(1200)
      expect(firstOg.height).toBe(630)
    }

    // twitter.images can be a string or an array; normalize to array
    const twImages = Array.isArray(result.twitter?.images)
      ? result.twitter?.images
      : result.twitter?.images
        ? [result.twitter?.images]
        : []

    const twFirst = twImages[0] as string | undefined
    expect(twFirst).toBe('https://example.com/image.jpg')
  })
})
