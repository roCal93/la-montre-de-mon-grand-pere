import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/lib/currency'
import { BoutiqueFilters } from '@/components/sections/BoutiqueFilters/BoutiqueFilters'
import { createStrapiClient } from '@/lib/strapi-client'
import { getPageSEO } from '@/lib/seo'
import { Layout } from '@/components/layout'
import { SectionGeneric } from '@/components/sections/SectionGeneric'
import type { DynamicBlock } from '@/types/custom'
import type { Page, PageCollectionResponse, StrapiEntity } from '@/types/strapi'
import type { Metadata } from 'next'

interface StrapiImage {
  id: number
  url: string
  alternativeText: string | null
}

interface StrapiCategory {
  id: number
  documentId: string
  name: string
  slug: string
}

interface GlobalConditionIndicator {
  pourcentage: number | null
}

interface GlobalConditionSummary {
  boitier: GlobalConditionIndicator | null
  cadran: GlobalConditionIndicator | null
  mouvement: GlobalConditionIndicator | null
  bracelet: GlobalConditionIndicator | null
}

interface StrapiProduct {
  id: number
  documentId: string
  name: string
  slug: string
  price: number
  compareAtPrice: number | null
  active: boolean
  images: StrapiImage[] | null
  category: StrapiCategory | null
  watchFile: {
    marketingShortDescription: string | null
    publicBadges: { label: string | null }[] | null
    etatGeneral: {
      etatGeneralGlobal: GlobalConditionSummary | null
    } | null
  } | null
}

type BoutiqueFilters = {
  categorie?: string
  q?: string
  prixMin?: string
  prixMax?: string
  tri?: string
  etat?: string
  page?: string
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  return (await getPageSEO('boutique', false, locale)) || {}
}

async function getProducts(locale: string): Promise<StrapiProduct[]> {
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL
  const token = process.env.STRAPI_API_TOKEN

  if (!strapiUrl) {
    console.error('[getProducts] NEXT_PUBLIC_STRAPI_URL is not configured')
    return []
  }

  const url = new URL(`${strapiUrl}/api/products`)
  url.searchParams.set('locale', locale)
  url.searchParams.set('fields[0]', 'name')
  url.searchParams.set('fields[1]', 'slug')
  url.searchParams.set('fields[2]', 'price')
  url.searchParams.set('fields[3]', 'compareAtPrice')
  url.searchParams.set('fields[4]', 'active')
  url.searchParams.set('populate[images][fields][0]', 'url')
  url.searchParams.set('populate[images][fields][1]', 'alternativeText')
  url.searchParams.set('populate[category][fields][0]', 'name')
  url.searchParams.set('populate[category][fields][1]', 'slug')
  url.searchParams.set(
    'populate[watchFile][fields][0]',
    'marketingShortDescription'
  )
  url.searchParams.set('populate[watchFile][populate][0]', 'publicBadges')
  url.searchParams.set('populate[watchFile][populate][1]', 'etatGeneral')
  url.searchParams.set('sort', 'createdAt:desc')
  url.searchParams.set('pagination[pageSize]', '100')

  try {
    const res = await fetch(url.toString(), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.error(`[getProducts] Strapi ${res.status} on ${url.pathname}`)
      return []
    }

    const json = (await res.json()) as { data: StrapiProduct[] }
    return json.data ?? []
  } catch (error) {
    console.error('[getProducts] fetch failed:', error)
    return []
  }
}

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    categorie?: string
    q?: string
    prixMin?: string
    prixMax?: string
    tri?: string
    etat?: string
    page?: string
  }>
}

const PAGE_SIZE = 12

function getConditionBucket(
  etatGeneral: StrapiProduct['watchFile']['etatGeneral'] | null | undefined
): string {
  const summary = etatGeneral?.etatGeneralGlobal
  if (!summary) return 'a-restaurer'

  const values = [
    summary.boitier?.pourcentage,
    summary.cadran?.pourcentage,
    summary.mouvement?.pourcentage,
    summary.bracelet?.pourcentage,
  ].filter((value): value is number => typeof value === 'number')

  if (values.length === 0) return 'a-restaurer'

  const avg = values.reduce((sum, value) => sum + value, 0) / values.length

  if (avg >= 80) return 'excellent'
  if (avg >= 60) return 'tres-bon'
  if (avg >= 40) return 'bon'
  return 'a-restaurer'
}

export const normalizeContainerWidth = (
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

export function buildBoutiqueListing(
  products: StrapiProduct[],
  filters: BoutiqueFilters,
  pageSize: number = PAGE_SIZE
) {
  const query = filters.q?.trim().toLowerCase() ?? ''
  const currentPage = Math.max(1, parseInt(filters.page ?? '1', 10) || 1)

  const categories = Array.from(
    new Map(
      products
        .map((product) => product.category)
        .filter((category): category is StrapiCategory => category !== null)
        .map((category) => [category.id, category])
    ).values()
  )

  const categoryFiltered = filters.categorie
    ? products.filter((product) => product.category?.slug === filters.categorie)
    : products

  const queryFiltered = query
    ? categoryFiltered.filter((product) => {
        const name = product.name?.toLowerCase() ?? ''
        const shortDescription =
          product.watchFile?.marketingShortDescription?.toLowerCase() ?? ''
        const categoryName = product.category?.name?.toLowerCase() ?? ''
        const badgesText = (product.watchFile?.publicBadges ?? [])
          .map((badge) => badge.label?.trim() ?? '')
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return (
          name.includes(query) ||
          shortDescription.includes(query) ||
          categoryName.includes(query) ||
          badgesText.includes(query)
        )
      })
    : categoryFiltered

  const prixMinNum = filters.prixMin ? parseFloat(filters.prixMin) : undefined
  const prixMaxNum = filters.prixMax ? parseFloat(filters.prixMax) : undefined

  const priceFiltered = queryFiltered.filter((product) => {
    if (prixMinNum !== undefined && product.price < prixMinNum) return false
    if (prixMaxNum !== undefined && product.price > prixMaxNum) return false
    return true
  })

  const conditionFiltered =
    filters.etat && filters.etat !== 'tous'
      ? priceFiltered.filter(
          (product) =>
            getConditionBucket(product.watchFile?.etatGeneral) === filters.etat
        )
      : priceFiltered

  const sorted = [...conditionFiltered].sort((a, b) => {
    if (filters.tri === 'prix-asc') return a.price - b.price
    if (filters.tri === 'prix-desc') return b.price - a.price
    return 0
  })

  const prices = products
    .map((p) => p.price)
    .filter((p): p is number => typeof p === 'number' && !isNaN(p))
  const catalogueMin = prices.length > 0 ? Math.floor(Math.min(...prices)) : 0
  const catalogueMax =
    prices.length > 0 ? Math.ceil(Math.max(...prices)) : 10000

  const totalProducts = sorted.length
  const pageCount = Math.max(1, Math.ceil(totalProducts / pageSize))
  const safePage = Math.min(currentPage, pageCount)
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  return {
    categories,
    catalogueMin,
    catalogueMax,
    totalProducts,
    pageCount,
    safePage,
    paginated,
  }
}

const fetchShopLandingPage = async ({
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

  const pageRes: PageCollectionResponse = await client.findMany('pages', {
    filters: { slug: { $eq: 'boutique' } },
    fields: ['title', 'hideTitle', 'slug'],
    populate:
      'sections.blocks.cards.image,sections.blocks.image,sections.blocks.imageDesktop,sections.blocks.buttons.file,sections.blocks.items.images.image,sections.blocks.items.images.link,sections.blocks.examples,sections.blocks.workItems.image,sections.blocks.workItems.categories,sections.blocks.privacyPolicy,sections.blocks.markerImage,sections.blocks.openingDays,sections.blocks.category',
    locale,
    publicationState: isDraft ? 'preview' : 'live',
    pagination: { page: 1, pageSize: 1 },
  })

  return pageRes.data[0] || null
}

export default async function BoutiquePage({ params, searchParams }: Props) {
  const { locale } = await params
  const { categorie, q, prixMin, prixMax, tri, etat, page } = await searchParams

  const shopPage = await fetchShopLandingPage({
    locale,
    isDraft: false,
  })
  const shopSections = (shopPage?.sections || []).sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  )

  const products = await getProducts(locale)
  const {
    categories,
    catalogueMin,
    catalogueMax,
    totalProducts,
    pageCount,
    safePage,
    paginated,
  } = buildBoutiqueListing(products, {
    categorie,
    q,
    prixMin,
    prixMax,
    tri,
    etat,
    page,
  })

  const baseFilterQs = [
    q ? `q=${encodeURIComponent(q)}` : '',
    prixMin ? `prixMin=${prixMin}` : '',
    prixMax ? `prixMax=${prixMax}` : '',
    tri ? `tri=${tri}` : '',
    etat ? `etat=${etat}` : '',
    categorie ? `categorie=${categorie}` : '',
  ]
    .filter(Boolean)
    .join('&')

  const buildPageHref = (p: number) =>
    `/${locale}/boutique?${[baseFilterQs, `page=${p}`].filter(Boolean).join('&')}`

  return (
    <Layout locale={locale}>
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {!shopPage?.hideTitle ? (
          <h1 className="mb-8 text-3xl font-bold tracking-tight">
            {shopPage?.title || (locale === 'fr' ? 'Boutique' : 'Shop')}
          </h1>
        ) : null}

        {shopSections.length > 0 ? (
          <div className="mb-12 space-y-8">
            {shopSections.map((section) => (
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

        <form method="GET" className="mb-8 flex justify-center">
          <div className="flex w-full max-w-md items-center gap-2">
            {categorie ? (
              <input type="hidden" name="categorie" value={categorie} />
            ) : null}
            {prixMin ? (
              <input type="hidden" name="prixMin" value={prixMin} />
            ) : null}
            {prixMax ? (
              <input type="hidden" name="prixMax" value={prixMax} />
            ) : null}
            {tri ? <input type="hidden" name="tri" value={tri} /> : null}
            {etat ? <input type="hidden" name="etat" value={etat} /> : null}
            <input
              type="search"
              name="q"
              defaultValue={q ?? ''}
              placeholder={
                locale === 'fr'
                  ? 'Rechercher une montre...'
                  : 'Search watches...'
              }
              className="w-full border border-neutral-300 bg-white px-4 py-2.5 font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.08em] outline-none transition-colors focus:border-black dark:border-neutral-600 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-white"
            />
            <button
              type="submit"
              className="border border-black bg-black px-4 py-2.5 font-[family-name:var(--font-geist-mono)] text-[12px] font-medium uppercase tracking-[0.08em] text-white transition-colors hover:bg-neutral-900 dark:border-white dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              {locale === 'fr' ? 'Rechercher' : 'Search'}
            </button>
          </div>
        </form>

        <BoutiqueFilters
          key={`${prixMin ?? ''}-${prixMax ?? ''}`}
          locale={locale}
          catalogueMin={catalogueMin}
          catalogueMax={catalogueMax}
          currentParams={{ categorie, q, prixMin, prixMax, tri, etat }}
          categories={categories}
        />

        {totalProducts === 0 ? (
          <p className="text-neutral-500">
            {locale === 'fr'
              ? 'Aucune montre ne correspond à vos critères.'
              : 'No watches match your criteria.'}
          </p>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
              {paginated.map((product) => {
                const img = product.images?.[0]
                const imgUrl = img
                  ? img.url.startsWith('http')
                    ? img.url
                    : `${process.env.NEXT_PUBLIC_STRAPI_URL}${img.url}`
                  : null
                const isSoldOut = !product.active

                return (
                  <li key={product.id}>
                    <Link
                      href={`/${locale}/boutique/${product.slug}`}
                      className="group block"
                    >
                      <article className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-neutral-300 group-hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                        <div className="relative aspect-square w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                          {imgUrl ? (
                            <Image
                              src={imgUrl}
                              alt={img?.alternativeText ?? product.name}
                              fill
                              className={`object-cover transition-transform duration-500 group-hover:scale-[1.03] ${
                                isSoldOut ? 'opacity-60' : ''
                              }`}
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            />
                          ) : null}
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/[0.03] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                          {isSoldOut ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">
                                {locale === 'fr' ? 'Vendu' : 'Sold'}
                              </span>
                            </div>
                          ) : null}
                        </div>

                        <div className="space-y-2.5 p-3 sm:p-4">
                          <h2 className="line-clamp-2 text-[15px] font-medium leading-snug tracking-[0.01em] transition-colors group-hover:text-black/80 dark:text-white dark:group-hover:text-white/80">
                            {product.name}
                          </h2>
                          {product.category ? (
                            <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-600">
                              {product.category.name}
                            </p>
                          ) : null}
                          <div className="flex items-baseline gap-2">
                            <span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tracking-[0.02em] text-neutral-900 dark:text-white">
                              {formatPrice(product.price)}
                            </span>
                            {product.compareAtPrice &&
                            product.compareAtPrice > product.price ? (
                              <span className="text-[12px] text-neutral-400 line-through">
                                {formatPrice(product.compareAtPrice)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    </Link>
                  </li>
                )
              })}
            </ul>

            {pageCount > 1 ? (
              <nav
                className="mt-10 mb-10 grid grid-cols-3 items-center"
                aria-label={
                  locale === 'fr' ? 'Pagination boutique' : 'Shop pagination'
                }
              >
                <div>
                  {safePage > 1 ? (
                    <Link
                      href={buildPageHref(safePage - 1)}
                      className="border border-neutral-300 px-4 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-700 transition-colors hover:border-black hover:text-black dark:border-neutral-400 dark:text-neutral-100 dark:hover:border-white dark:hover:text-white"
                    >
                      {locale === 'fr' ? '← Précédent' : '← Previous'}
                    </Link>
                  ) : null}
                </div>
                <span className="text-center font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-400 dark:text-neutral-300">
                  {locale === 'fr'
                    ? `Page ${safePage} sur ${pageCount}`
                    : `Page ${safePage} of ${pageCount}`}
                </span>
                <div className="flex justify-end">
                  {safePage < pageCount ? (
                    <Link
                      href={buildPageHref(safePage + 1)}
                      className="border border-neutral-300 px-4 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-700 transition-colors hover:border-black hover:text-black dark:border-neutral-400 dark:text-neutral-100 dark:hover:border-white dark:hover:text-white"
                    >
                      {locale === 'fr' ? 'Suivant →' : 'Next →'}
                    </Link>
                  ) : null}
                </div>
              </nav>
            ) : null}
          </>
        )}
      </main>
    </Layout>
  )
}
