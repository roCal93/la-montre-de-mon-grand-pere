import type { Metadata } from 'next'
import { getPageSEO } from '@/lib/seo'
import { createStrapiClient } from '@/lib/strapi-client'
import { Layout } from '@/components/layout'
import { SectionGeneric } from '@/components/sections/SectionGeneric'
import type { DynamicBlock } from '@/types/custom'
import type { Page, PageCollectionResponse, StrapiEntity } from '@/types/strapi'
import PanierPageClient from './PanierPageClient'

interface PanierPageProps {
  params: Promise<{ locale: string }>
}

const normalizeContainerWidth = (
  width: unknown
): 'small' | 'medium' | 'large' | 'full' => {
  if (
    width === 'small' ||
    width === 'medium' ||
    width === 'large' ||
    width === 'full'
  ) {
    return width
  }

  return 'medium'
}

const fetchCartLandingPage = async ({
  locale,
  isDraft,
}: {
  locale: string
  isDraft: boolean
}): Promise<(Page & StrapiEntity) | null> => {
  const apiToken = isDraft
    ? process.env.STRAPI_PREVIEW_TOKEN || process.env.STRAPI_API_TOKEN
    : process.env.STRAPI_API_TOKEN

  const client = createStrapiClient({
    apiUrl: process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337',
    apiToken,
  })

  const baseQuery = {
    fields: ['title', 'hideTitle', 'slug'],
    populate:
      'sections.blocks.cards.image,sections.blocks.image,sections.blocks.images,sections.blocks.imageDesktop,sections.blocks.buttons.file,sections.blocks.items.images.image,sections.blocks.items.images.link,sections.blocks.examples,sections.blocks.workItems.image,sections.blocks.workItems.categories,sections.blocks.privacyPolicy,sections.blocks.markerImage,sections.blocks.openingDays,sections.blocks.category',
    locale,
    publicationState: (isDraft ? 'preview' : 'live') as 'preview' | 'live',
    pagination: { page: 1, pageSize: 1 },
  }

  const panierRes: PageCollectionResponse = await client.findMany('pages', {
    ...baseQuery,
    filters: { slug: { $eq: 'panier' } },
  })

  if (panierRes.data[0]) {
    return panierRes.data[0]
  }

  const cartRes: PageCollectionResponse = await client.findMany('pages', {
    ...baseQuery,
    filters: { slug: { $eq: 'cart' } },
  })

  return cartRes.data[0] || null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  const seo =
    (await getPageSEO('panier', false, locale)) ||
    (await getPageSEO('cart', false, locale))

  return seo || {}
}

export default async function PanierPage({ params }: PanierPageProps) {
  const { locale } = await params

  const cartPage = await fetchCartLandingPage({
    locale,
    isDraft: false,
  })
  const cartSections = (cartPage?.sections || []).sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  )

  return (
    <Layout locale={locale}>
      {cartSections.length > 0 ? (
        <div className="mx-auto mb-12 mt-12 max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
          {cartSections.map((section) => (
            <SectionGeneric
              key={section.id}
              identifier={section.identifier}
              title={section.hideTitle ? undefined : section.title}
              blocks={section.blocks as DynamicBlock[]}
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
        </div>
      ) : null}

      <PanierPageClient
        locale={locale}
        pageTitle={cartPage?.title}
        hideTitle={Boolean(cartPage?.hideTitle)}
      />
    </Layout>
  )
}
