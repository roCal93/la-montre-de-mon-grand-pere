import type { MetadataRoute } from 'next'
import { createStrapiClient } from '@/lib/strapi-client'
import type { Page, Product } from '@/types/strapi'
import { fetchBlogSitemapEntries } from '@/lib/blog'

const buildAbsoluteUrl = (path = '/'): string => {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
  if (!path.startsWith('/')) {
    path = `/${path}`
  }
  return `${base}${path}`
}

const buildProductPath = (locale: string, slug: string): string => {
  const shopSegment = locale === 'en' ? 'shop' : 'boutique'
  return `/${locale}/${shopSegment}/${slug}`
}

const hasLocaleAndSlug = (entry: {
  locale?: string
  slug?: string
}): entry is { locale: string; slug: string } =>
  typeof entry.locale === 'string' &&
  entry.locale.length > 0 &&
  typeof entry.slug === 'string' &&
  entry.slug.length > 0

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const client = createStrapiClient({
      apiUrl: process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337',
      apiToken: process.env.STRAPI_API_TOKEN,
    })
    const res = await client.findMany<Page>('pages', { populate: '*' })
    const blogEntries = await fetchBlogSitemapEntries()
    const productRes = await client.findMany<Product>('products', {
      fields: ['slug', 'locale', 'active'],
      populate: {
        localizations: {
          fields: ['slug', 'locale', 'active'],
        },
      },
      publicationState: 'live',
      pagination: {
        page: 1,
        pageSize: 1000,
      },
    })

    const pages = (res?.data || []).filter((p: Page) => !p.noIndex)
    const now = new Date()

    const pageEntries = pages.flatMap((page) => {
      const allLocales = [
        { locale: page.locale, slug: page.slug },
        ...(page.localizations || []),
      ]

      return allLocales.map((p) => {
        // If slug is 'home' (or falsy) we map to the locale root: e.g. /fr
        const isHome = !p.slug || p.slug === 'home'
        const path = isHome ? `/${p.locale}` : `/${p.locale}/${p.slug}`
        return {
          url: buildAbsoluteUrl(path),
          lastModified: now,
          changeFrequency: 'monthly' as const,
        }
      })
    })

    const blogArticleEntries = blogEntries.flatMap((article) => {
      const allLocales = [
        { locale: article.locale, slug: article.slug },
        ...(article.localizations || []),
      ].filter((entry) => entry.locale && entry.slug)

      return allLocales.map((entry) => ({
        url: buildAbsoluteUrl(`/${entry.locale}/blog/${entry.slug}`),
        lastModified: now,
        changeFrequency: 'weekly' as const,
      }))
    })

    const blogIndexEntries = [
      {
        url: buildAbsoluteUrl('/fr/blog'),
        lastModified: now,
        changeFrequency: 'weekly' as const,
      },
      {
        url: buildAbsoluteUrl('/en/blog'),
        lastModified: now,
        changeFrequency: 'weekly' as const,
      },
    ]

    const productEntries = (productRes?.data || [])
      .filter((product) => product.active !== false)
      .flatMap((product) => {
        const allLocales = [
          { locale: product.locale, slug: product.slug },
          ...(product.localizations || []),
        ].filter(hasLocaleAndSlug)

        return allLocales.map((entry) => ({
          url: buildAbsoluteUrl(buildProductPath(entry.locale, entry.slug)),
          lastModified: now,
          changeFrequency: 'weekly' as const,
        }))
      })

    const allEntries = [
      ...pageEntries,
      ...blogIndexEntries,
      ...blogArticleEntries,
      ...productEntries,
    ]

    const uniqueEntries = Array.from(
      new Map(allEntries.map((entry) => [entry.url, entry])).values()
    )

    return uniqueEntries
  } catch (error) {
    console.error('Erreur lors de la génération du sitemap:', error)
    // Retourner un sitemap vide ou avec des pages par défaut
    return [
      {
        url: buildAbsoluteUrl('/fr'),
        lastModified: new Date(),
        changeFrequency: 'monthly',
      },
      {
        url: buildAbsoluteUrl('/en'),
        lastModified: new Date(),
        changeFrequency: 'monthly',
      },
    ]
  }
}
