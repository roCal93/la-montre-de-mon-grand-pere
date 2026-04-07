import { createStrapiClient } from '@/lib/strapi-client'
import { unstable_cache } from 'next/cache'
import { buildMetadata, type Hreflang } from '@/lib/seo'
import { Layout } from '@/components/layout'
import { Hero } from '@/components/sections/Hero'
import { SectionGeneric } from '@/components/sections/SectionGeneric'
import {
  PageCollectionResponse,
  StrapiEntity,
  Page as PageType,
} from '@/types/strapi'
import { DynamicBlock } from '@/types/custom'
import { notFound, redirect } from 'next/navigation'
import { defaultLocale } from '@/lib/locales'
import { isSupportedLocale } from '@/lib/supported-locales'

type OpeningDay = {
  dayLabel: string
  isClosedAllDay?: boolean | null
  firstPeriodOpenTime?: string | null
  firstPeriodCloseTime?: string | null
  secondPeriodOpenTime?: string | null
  secondPeriodCloseTime?: string | null
}

const getSharedOpeningDays = (sections: unknown[]): OpeningDay[] => {
  for (const section of sections) {
    const blocks = (section as { blocks?: unknown[] }).blocks
    if (!Array.isArray(blocks)) continue

    for (const block of blocks) {
      const component = (block as { __component?: string }).__component
      const openingDays = (block as { openingDays?: unknown }).openingDays
      if (
        component === 'blocks.text-map-block' &&
        Array.isArray(openingDays) &&
        openingDays.length > 0
      ) {
        return openingDays as OpeningDay[]
      }
    }
  }

  return []
}

const fetchPageData = async (
  slug: string,
  locale: string,
  isDraft: boolean
) => {
  const apiToken = isDraft
    ? process.env.STRAPI_PREVIEW_TOKEN || process.env.STRAPI_API_TOKEN
    : process.env.STRAPI_API_TOKEN

  const client = createStrapiClient({
    apiUrl: process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337',
    apiToken,
  })

  const pageRes: PageCollectionResponse = await client.findMany('pages', {
    filters: { slug: { $eq: slug } },
    fields: [
      'title',
      'hideTitle',
      'slug',
      'seoTitle',
      'seoDescription',
      'noIndex',
      'locale',
    ],
    populate:
      'sections.blocks.cards.image,sections.blocks.image,sections.blocks.imageDesktop,sections.blocks.buttons.file,sections.blocks.items.images.image,sections.blocks.items.images.link,sections.blocks.examples,sections.blocks.workItems.image,sections.blocks.workItems.categories,sections.blocks.privacyPolicy,sections.blocks.markerImage,sections.blocks.openingDays,sections.blocks.category,seoImage,localizations',
    locale,
    publicationState: isDraft ? 'preview' : 'live',
  })

  return pageRes
}

const fetchPageDataFallback = async (slug: string, isDraft: boolean) => {
  const apiToken = isDraft
    ? process.env.STRAPI_PREVIEW_TOKEN || process.env.STRAPI_API_TOKEN
    : process.env.STRAPI_API_TOKEN

  const client = createStrapiClient({
    apiUrl: process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337',
    apiToken,
  })

  const fallbackRes: PageCollectionResponse = await client.findMany('pages', {
    filters: { slug: { $eq: slug } },
    fields: [
      'title',
      'hideTitle',
      'slug',
      'seoTitle',
      'seoDescription',
      'noIndex',
      'locale',
    ],
    populate:
      'sections.blocks.cards.image,sections.blocks.image,sections.blocks.imageDesktop,sections.blocks.buttons.file,sections.blocks.items.images.image,sections.blocks.items.images.link,sections.blocks.examples,sections.blocks.workItems.image,sections.blocks.workItems.categories,sections.blocks.privacyPolicy,sections.blocks.markerImage,sections.blocks.openingDays,sections.blocks.category,seoImage,localizations',
    publicationState: isDraft ? 'preview' : 'live',
  })

  return fallbackRes
}

const getPageData = unstable_cache(
  async (slug: string, locale: string) => fetchPageData(slug, locale, false),
  ['page-data'],
  { revalidate: 3600, tags: ['strapi-pages'] }
)

const getPageDataFallback = unstable_cache(
  async (slug: string) => fetchPageDataFallback(slug, false),
  ['page-data-fallback'],
  { revalidate: 3600, tags: ['strapi-pages'] }
)

// Normalize container width coming from Strapi to the allowed values
const normalizeContainerWidth = (
  width: unknown
): 'small' | 'medium' | 'large' | 'full' => {
  if (
    width === 'small' ||
    width === 'medium' ||
    width === 'large' ||
    width === 'full'
  )
    return width
  return 'medium'
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { slug, locale } = await params

  const apiToken = process.env.STRAPI_API_TOKEN

  const client = createStrapiClient({
    apiUrl: process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337',
    apiToken,
  })
  const res: PageCollectionResponse = await client.findMany('pages', {
    filters: { slug: { $eq: slug } },
    fields: [
      'title',
      'slug',
      'seoTitle',
      'seoDescription',
      'noIndex',
      'locale',
    ],
    populate: {
      seoImage: {
        fields: ['url', 'alternativeText', 'width', 'height', 'formats'],
      },
      localizations: {
        fields: ['slug', 'locale'],
      },
    },
    locale,
    publicationState: 'live',
  })

  const page = res?.data?.[0]
  if (!page) return {}

  const siteBase = (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    'https://example.com'
  ).replace(/\/$/, '')

  const pageLocalizations = page.localizations ?? []

  const alternates: Hreflang[] = [
    {
      hreflang: page.locale || 'fr',
      href: `${siteBase}/${page.locale || 'fr'}/${slug}`,
    },
    ...pageLocalizations.map((loc: PageType & StrapiEntity) => ({
      hreflang: loc.locale || 'fr',
      href: `${siteBase}/${loc.locale || 'fr'}/${slug}`,
    })),
  ]

  const description = Array.isArray(page.seoDescription)
    ? (page.seoDescription?.[0]?.children?.[0]?.text ?? undefined)
    : typeof page.seoDescription === 'string'
      ? page.seoDescription
      : undefined

  return buildMetadata({
    title: page.seoTitle || page.title,
    description,
    image: page.seoImage?.url,
    noIndex: page.noIndex,
    url: `${siteBase}/${page.locale}/${slug}`,
    alternates,
  })
}

export const dynamicParams = true // Allow dynamic params for pages that might not exist yet

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>
  searchParams?: Promise<{ draft?: string }>
}) {
  const { locale, slug } = await params

  // Defensive: [locale]/layout.tsx already validates, but keep it here too.
  if (!(await isSupportedLocale(locale))) {
    notFound()
  }

  // Redirige /[locale]/home vers /[locale]
  if (slug === 'home') {
    redirect(`/${locale}`)
  }

  const sparams = searchParams ? await searchParams : undefined
  const isDraft = sparams?.draft === 'true'

  // Bypass cache when Draft Mode is enabled (preview mode) regardless of draft/published status
  let pageRes = isDraft
    ? await fetchPageData(slug, locale, true)
    : await getPageData(slug, locale)

  if (!pageRes.data.length) {
    // Resolve locale fallback in-place instead of redirecting late in RSC render,
    // which can trigger ERR_HTTP_HEADERS_SENT during streamed navigation.
    if (locale !== defaultLocale) {
      const defaultRes = isDraft
        ? await fetchPageData(slug, defaultLocale, true)
        : await getPageData(slug, defaultLocale)

      if (defaultRes.data.length) {
        pageRes = defaultRes
      }
    }

    if (!pageRes.data.length) {
      // Fallback: try without locale (global)
      const fallbackRes = isDraft
        ? await fetchPageDataFallback(slug, true)
        : await getPageDataFallback(slug)

      if (!fallbackRes.data.length) {
        // Nothing found in any locale → show 404 page
        notFound()
      }

      pageRes = fallbackRes
    }
  }

  const page = pageRes.data[0]
  const sections = (page.sections || []).sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  )
  let sharedOpeningDays = getSharedOpeningDays(sections)

  if (sharedOpeningDays.length === 0) {
    const homeRes = isDraft
      ? await fetchPageData('home', locale, true)
      : await getPageData('home', locale)
    const homeSections = homeRes?.data?.[0]?.sections || []
    sharedOpeningDays = getSharedOpeningDays(homeSections)

    if (sharedOpeningDays.length === 0 && locale !== defaultLocale) {
      const homeDefaultRes = isDraft
        ? await fetchPageData('home', defaultLocale, true)
        : await getPageData('home', defaultLocale)
      const homeDefaultSections = homeDefaultRes?.data?.[0]?.sections || []
      sharedOpeningDays = getSharedOpeningDays(homeDefaultSections)
    }
  }

  return (
    <Layout locale={locale}>
      {!page.hideTitle && <Hero title={page.title || ''} />}

      {sections.map((section) => (
        <SectionGeneric
          key={section.id}
          identifier={section.identifier}
          title={section.hideTitle ? undefined : section.title}
          blocks={section.blocks as DynamicBlock[]}
          sharedOpeningDays={sharedOpeningDays}
          locale={locale}
          containerWidth={normalizeContainerWidth(section.containerWidth)}
          spacingTop={
            section.spacingTop as
              | 'none'
              | 'small'
              | 'medium'
              | 'large'
              | undefined
          }
          spacingBottom={
            section.spacingBottom as
              | 'none'
              | 'small'
              | 'medium'
              | 'large'
              | undefined
          }
        />
      ))}
    </Layout>
  )
}
