import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Layout } from '@/components/layout'
import { SectionGeneric } from '@/components/sections/SectionGeneric'
import { buildMetadata, type Hreflang } from '@/lib/seo'
import { fetchBlogArticleBySlug } from '@/lib/blog'
import type { DynamicBlock } from '@/types/custom'
import type { Metadata } from 'next'

export const dynamicParams = true

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

const extractDescription = (
  seoDescription: unknown,
  fallback?: string
): string | undefined => {
  if (Array.isArray(seoDescription)) {
    return seoDescription
      .map((block) =>
        Array.isArray((block as { children?: unknown[] }).children)
          ? (block as { children: Array<{ text?: string }> }).children
              .map((child) => child.text || '')
              .join(' ')
          : ''
      )
      .join(' ')
      .trim()
  }

  if (typeof seoDescription === 'string') {
    return seoDescription
  }

  return fallback
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params

  const article = await fetchBlogArticleBySlug({
    slug,
    locale,
    isDraft: false,
  })

  if (!article) {
    return {}
  }

  const siteBase = (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    'https://example.com'
  ).replace(/\/$/, '')

  const canonical = `${siteBase}/${locale}/blog/${slug}`

  const alternates: Hreflang[] = [
    { hreflang: locale, href: canonical },
    ...(article.localizations || [])
      .filter((loc) => loc.slug)
      .map((loc) => ({
        hreflang: loc.locale || 'fr',
        href: `${siteBase}/${loc.locale || 'fr'}/blog/${loc.slug}`,
      })),
  ]

  return buildMetadata({
    title: article.seoTitle || article.title,
    description: extractDescription(article.seoDescription, article.excerpt),
    image: article.seoImage?.url || article.coverImage?.url,
    noIndex: article.noIndex,
    url: canonical,
    alternates,
  })
}

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export default async function BlogArticlePage({ params }: Props) {
  const { locale, slug } = await params

  const article = await fetchBlogArticleBySlug({
    slug,
    locale,
    isDraft: false,
  })

  if (!article) {
    notFound()
  }

  const coverImage = article.coverImage
  const coverImageUrl = coverImage?.url
    ? coverImage.url.startsWith('http')
      ? coverImage.url
      : `${process.env.NEXT_PUBLIC_STRAPI_URL}${coverImage.url}`
    : null

  const sections = (article.sections || []).sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  )

  const publicationDate = formatPublicationDate(
    article.publicationDate || article.createdAt,
    locale
  )

  return (
    <Layout locale={locale}>
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href={`/${locale}/blog`}
          className="mb-8 inline-flex items-center font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.1em] text-neutral-400 transition-colors hover:text-black dark:hover:text-white"
        >
          {locale === 'fr' ? '← Retour au blog' : '← Back to blog'}
        </Link>

        <article>
          <header className="mb-10 space-y-5 border-b border-neutral-200 pb-8">
            <h1 className="text-[30px] font-medium leading-tight sm:text-[36px]">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-2">
              {publicationDate ? (
                <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-500">
                  {publicationDate}
                </span>
              ) : null}
              {article.authorName ? (
                <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-500">
                  {article.authorName}
                </span>
              ) : null}
              {(article.categories || []).map((category) => (
                <span
                  key={category.id}
                  className="border border-neutral-300 px-[10px] py-[4px] font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-500"
                >
                  {category.name}
                </span>
              ))}
            </div>

            {article.excerpt ? (
              <p className="max-w-3xl border-l-2 border-black pl-4 text-[14px] leading-[1.8] text-neutral-500">
                {article.excerpt}
              </p>
            ) : null}
          </header>

          {coverImageUrl ? (
            <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-neutral-100">
              <Image
                src={coverImageUrl}
                alt={
                  coverImage?.alternativeText ||
                  article.title ||
                  'Blog cover image'
                }
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 1000px"
              />
            </div>
          ) : null}

          {sections.length > 0 ? (
            <div className="space-y-8">
              {sections.map((section) => (
                <SectionGeneric
                  key={section.id}
                  identifier={section.identifier}
                  title={section.hideTitle ? undefined : section.title}
                  blocks={section.blocks as DynamicBlock[]}
                  locale={locale}
                  containerWidth={normalizeContainerWidth(
                    section.containerWidth
                  )}
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
          ) : (
            <div className="prose max-w-none text-neutral-700">
              <p>{article.excerpt || ''}</p>
            </div>
          )}
        </article>
      </main>
    </Layout>
  )
}
