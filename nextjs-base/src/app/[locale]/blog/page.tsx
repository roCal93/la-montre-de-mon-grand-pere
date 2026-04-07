import Image from 'next/image'
import Link from 'next/link'
import { fetchBlogArticles, type BlogArticle } from '@/lib/blog'
import { createStrapiClient } from '@/lib/strapi-client'
import { getPageSEO } from '@/lib/seo'
import { Layout } from '@/components/layout'
import { SectionGeneric } from '@/components/sections/SectionGeneric'
import type { DynamicBlock } from '@/types/custom'
import type { Page, PageCollectionResponse, StrapiEntity } from '@/types/strapi'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  return (await getPageSEO('blog', false, locale)) || {}
}

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string; q?: string }>
}

const PAGE_SIZE = 12

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

const fetchBlogLandingPage = async ({
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
    filters: { slug: { $eq: 'blog' } },
    fields: ['title', 'hideTitle', 'slug'],
    populate:
      'sections.blocks.cards.image,sections.blocks.image,sections.blocks.imageDesktop,sections.blocks.buttons.file,sections.blocks.items.images.image,sections.blocks.items.images.link,sections.blocks.examples,sections.blocks.workItems.image,sections.blocks.workItems.categories,sections.blocks.privacyPolicy,sections.blocks.markerImage,sections.blocks.openingDays,sections.blocks.category',
    locale,
    publicationState: isDraft ? 'preview' : 'live',
    pagination: { page: 1, pageSize: 1 },
  })

  return pageRes.data[0] || null
}

const formatPublicationDate = (date: string | undefined, locale: string) => {
  if (!date) return null

  try {
    return new Date(date).toLocaleDateString(
      locale === 'fr' ? 'fr-FR' : 'en-US',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }
    )
  } catch {
    return null
  }
}

const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const extractAllStrings = (
  value: unknown,
  seen = new Set<object>()
): string[] => {
  if (value == null) return []
  if (typeof value === 'string') return [value]
  if (typeof value !== 'object') return []
  if (seen.has(value)) return []

  seen.add(value)

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractAllStrings(item, seen))
  }

  return Object.values(value as Record<string, unknown>).flatMap((entry) =>
    extractAllStrings(entry, seen)
  )
}

const articleMatchesQuery = (article: BlogArticle, query: string) => {
  if (!query) return true

  const searchableText = [
    article.title,
    article.excerpt,
    article.authorName,
    article.seoTitle,
    ...(article.categories ?? []).map((category) => category.name),
    ...extractAllStrings(article.sections),
    ...extractAllStrings(article.seoDescription),
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')

  return normalizeSearchText(searchableText).includes(query)
}

type BlogPagination = {
  page: number
  pageSize: number
  pageCount: number
  total: number
}

export default async function BlogPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { page, q } = await searchParams
  const query = q?.trim() ?? ''
  const normalizedQuery = normalizeSearchText(query)

  const currentPage = Number(page || '1')
  const safePage =
    Number.isFinite(currentPage) && currentPage > 0 ? currentPage : 1

  let articles: BlogArticle[] = []
  let pagination: BlogPagination | null = null

  if (normalizedQuery) {
    const allArticlesRes = await fetchBlogArticles({
      locale,
      isDraft: false,
      page: 1,
      pageSize: 1000,
      includeSections: true,
    })

    const matchingArticles = allArticlesRes.data.filter((article) =>
      articleMatchesQuery(article, normalizedQuery)
    )

    const total = matchingArticles.length
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const clampedPage = Math.min(safePage, pageCount)
    const start = (clampedPage - 1) * PAGE_SIZE

    articles = matchingArticles.slice(start, start + PAGE_SIZE)
    pagination = {
      page: clampedPage,
      pageSize: PAGE_SIZE,
      pageCount,
      total,
    }
  } else {
    const articleRes = await fetchBlogArticles({
      locale,
      isDraft: false,
      page: safePage,
      pageSize: PAGE_SIZE,
    })

    articles = articleRes.data
    pagination = articleRes.meta.pagination
      ? {
          page: articleRes.meta.pagination.page,
          pageSize: articleRes.meta.pagination.pageSize,
          pageCount: articleRes.meta.pagination.pageCount,
          total: articleRes.meta.pagination.total,
        }
      : null
  }

  const blogPage = await fetchBlogLandingPage({
    locale,
    isDraft: false,
  })
  const blogSections = (blogPage?.sections || []).sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  )

  const hasPreviousPage = Boolean(pagination && pagination.page > 1)
  const hasNextPage = Boolean(
    pagination && pagination.page < pagination.pageCount
  )

  return (
    <Layout locale={locale}>
      <main className="mx-auto mb-10 max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10 pb-6">
          {!blogPage?.hideTitle ? (
            <h1 className="text-[23px] font-medium leading-snug">
              {blogPage?.title || (locale === 'fr' ? 'Blog' : 'Blog')}
            </h1>
          ) : null}
          {!blogPage ? (
            <p className="mt-3 max-w-3xl border-l-2 border-black pl-4 text-[14px] leading-[1.8] text-neutral-500">
              {locale === 'fr'
                ? 'Conseils horlogers, histoires et nouveautes de la maison.'
                : 'Watchmaking insights, stories and latest house updates.'}
            </p>
          ) : null}
        </header>

        {blogSections.length > 0 ? (
          <div className="mb-12 space-y-8">
            {blogSections.map((section) => (
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
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder={
                locale === 'fr'
                  ? 'Rechercher un article...'
                  : 'Search articles...'
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

        {articles.length === 0 ? (
          <p className="text-neutral-500">
            {query
              ? locale === 'fr'
                ? 'Aucun article ne correspond a votre recherche.'
                : 'No articles match your search.'
              : locale === 'fr'
                ? 'Aucun article publie pour le moment.'
                : 'No published articles yet.'}
          </p>
        ) : (
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => {
              const image = article.coverImage
              const imageUrl = image?.url
                ? image.url.startsWith('http')
                  ? image.url
                  : `${process.env.NEXT_PUBLIC_STRAPI_URL}${image.url}`
                : null
              const formattedDate = formatPublicationDate(
                article.publicationDate || article.createdAt,
                locale
              )

              return (
                <li key={article.slug}>
                  <Link
                    href={`/${locale}/blog/${article.slug}`}
                    className="group block"
                  >
                    <article className="h-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-neutral-300 group-hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={
                              image?.alternativeText ||
                              article.title ||
                              'Blog article'
                            }
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        ) : null}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/[0.03] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      </div>

                      <div className="space-y-3.5 p-3 sm:p-4">
                        {formattedDate ? (
                          <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-600 dark:text-neutral-400">
                            {formattedDate}
                          </p>
                        ) : null}

                        <h2 className="line-clamp-2 text-[15px] font-medium leading-snug tracking-[0.01em] transition-colors group-hover:text-black/80 dark:text-white dark:group-hover:text-white/80">
                          {article.title}
                        </h2>

                        {article.excerpt ? (
                          <p className="line-clamp-3 border-l-2 border-black pl-3 text-[13px] leading-[1.7] text-neutral-500 dark:border-white dark:text-neutral-400">
                            {article.excerpt}
                          </p>
                        ) : null}

                        {(article.categories || []).length > 0 ? (
                          <p className="font-[family-name:var(--font-geist-mono)] text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-600 dark:text-neutral-400">
                            {article.categories?.[0]?.name}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}

        {(hasPreviousPage || hasNextPage) && pagination ? (
          <nav
            className="mt-10 grid grid-cols-3 items-center"
            aria-label={
              locale === 'fr' ? 'Pagination du blog' : 'Blog pagination'
            }
          >
            <div>
              {hasPreviousPage ? (
                <Link
                  href={`/${locale}/blog?page=${pagination.page - 1}${query ? `&q=${encodeURIComponent(query)}` : ''}`}
                  className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  {locale === 'fr' ? 'Page précédente' : 'Previous page'}
                </Link>
              ) : null}
            </div>

            <span className="text-center text-sm text-neutral-500">
              {locale === 'fr'
                ? `Page ${pagination.page} sur ${pagination.pageCount}`
                : `Page ${pagination.page} of ${pagination.pageCount}`}
            </span>

            <div className="flex justify-end">
              {hasNextPage ? (
                <Link
                  href={`/${locale}/blog?page=${pagination.page + 1}${query ? `&q=${encodeURIComponent(query)}` : ''}`}
                  className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  {locale === 'fr' ? 'Page suivante' : 'Next page'}
                </Link>
              ) : null}
            </div>
          </nav>
        ) : null}
      </main>
    </Layout>
  )
}
