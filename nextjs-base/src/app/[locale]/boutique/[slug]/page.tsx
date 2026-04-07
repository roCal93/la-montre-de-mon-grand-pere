import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { formatPrice } from '@/lib/currency'
import { Layout } from '@/components/layout'
import { AddToCartButton } from './AddToCartButton'
import { WishlistButton } from '@/components/espace-client/WishlistButton'
import ProductImageGallery from './ProductImageGallery'
import BeforeAfterSlider from './BeforeAfterSlider'

interface StrapiImage {
  id: number
  url: string
  alternativeText: string | null
}

interface TechSpec {
  key: string
  val: string
}

interface ConditionRating {
  label: string
  value: number // 0–100
  note: string
}

interface StrapiProduct {
  id: number
  documentId: string
  name: string
  slug: string
  description: string | null
  shortDescription: string | null
  reference: string | null
  brand: string | null
  price: number
  compareAtPrice: number | null
  stock: number
  active: boolean
  badges: string[] | null
  technicalSpecs: TechSpec[] | null
  conditionRatings: ConditionRating[] | null
  restorationWork: string[] | null
  images: StrapiImage[] | null
  beforeImage: StrapiImage[] | StrapiImage | null
  afterImage: StrapiImage[] | StrapiImage | null
  category: {
    id: number
    documentId: string
    name: string
    slug: string
  } | null
}

async function getProduct(
  slug: string,
  locale: string
): Promise<StrapiProduct | null> {
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL
  const token = process.env.STRAPI_API_TOKEN

  if (!strapiUrl) {
    console.error('[getProduct] NEXT_PUBLIC_STRAPI_URL is not configured')
    return null
  }

  const buildUrl = (includeExtendedFields: boolean) => {
    const url = new URL(`${strapiUrl}/api/products`)
    url.searchParams.set('filters[slug][$eq]', slug)
    url.searchParams.set('locale', locale)
    url.searchParams.set('fields[0]', 'name')
    url.searchParams.set('fields[1]', 'slug')
    url.searchParams.set('fields[2]', 'description')
    url.searchParams.set('fields[3]', 'shortDescription')
    url.searchParams.set('fields[4]', 'price')
    url.searchParams.set('fields[5]', 'compareAtPrice')
    url.searchParams.set('fields[6]', 'stock')
    url.searchParams.set('fields[7]', 'active')

    if (includeExtendedFields) {
      url.searchParams.set('fields[8]', 'reference')
      url.searchParams.set('fields[9]', 'brand')
      url.searchParams.set('fields[10]', 'badges')
      url.searchParams.set('fields[11]', 'technicalSpecs')
      url.searchParams.set('fields[12]', 'conditionRatings')
      url.searchParams.set('fields[13]', 'restorationWork')
      url.searchParams.set('populate[beforeImage][fields][0]', 'url')
      url.searchParams.set(
        'populate[beforeImage][fields][1]',
        'alternativeText'
      )
      url.searchParams.set('populate[afterImage][fields][0]', 'url')
      url.searchParams.set('populate[afterImage][fields][1]', 'alternativeText')
    }

    url.searchParams.set('populate[images][fields][0]', 'url')
    url.searchParams.set('populate[images][fields][1]', 'alternativeText')
    url.searchParams.set('populate[category][fields][0]', 'name')
    url.searchParams.set('populate[category][fields][1]', 'slug')

    return url
  }

  const url = buildUrl(true)

  try {
    const res = await fetch(url.toString(), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      const body = await res.text()
      if (res.status === 400 && body.includes('Invalid key')) {
        try {
          const fallbackRes = await fetch(buildUrl(false).toString(), {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            cache: 'no-store',
            signal: AbortSignal.timeout(8000),
          })

          if (!fallbackRes.ok) {
            const fallbackBody = await fallbackRes.text()
            console.error(
              `[getProduct:fallback] Strapi ${fallbackRes.status} for slug="${slug}":`,
              fallbackBody
            )
            return null
          }

          const fallbackJson = (await fallbackRes.json()) as {
            data: StrapiProduct[]
          }
          return fallbackJson.data?.[0] ?? null
        } catch (fallbackError) {
          console.error('[getProduct:fallback] fetch failed:', fallbackError)
          return null
        }
      }

      console.error(
        `[getProduct] Strapi ${res.status} for slug="${slug}":`,
        body
      )
      return null
    }

    const json = (await res.json()) as { data: StrapiProduct[] }
    return json.data?.[0] ?? null
  } catch (error) {
    console.error(`[getProduct] fetch failed for slug="${slug}":`, error)
    return null
  }
}

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const product = await getProduct(slug, locale)
  if (!product) return {}
  return {
    title: product.name,
    description: product.shortDescription || product.description || undefined,
  }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 mt-8 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.15em] text-neutral-400">
      {children}
    </p>
  )
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params
  const product = await getProduct(slug, locale)
  if (!product) notFound()

  const isSoldOut = !product.active || product.stock <= 0

  const {
    name,
    shortDescription,
    description,
    reference,
    brand,
    price,
    compareAtPrice,
    stock,
    images,
    badges,
    technicalSpecs,
    conditionRatings,
    restorationWork,
    beforeImage,
    afterImage,
  } = product

  const buildImgUrl = (rawUrl: string) =>
    rawUrl.startsWith('http')
      ? rawUrl
      : `${process.env.NEXT_PUBLIC_STRAPI_URL}${rawUrl}`

  const galleryImages = (images ?? []).map((img) => ({
    id: img.id,
    url: buildImgUrl(img.url),
    alternativeText: img.alternativeText,
  }))
  const firstImgUrl = galleryImages[0]?.url ?? null

  // Build all badges: custom ones from Strapi + auto badges
  const allBadges: { label: string; highlight?: boolean }[] = [
    ...(badges ?? []).map((b) => ({ label: b })),
    ...(isSoldOut
      ? [{ label: locale === 'fr' ? 'Vendu' : 'Sold' }]
      : [
          {
            label: locale === 'fr' ? 'Stock unique' : 'Unique piece',
            highlight: true,
          },
        ]),
  ]

  const shopPath = locale === 'fr' ? 'boutique' : 'shop'

  const hasSpecs = technicalSpecs && technicalSpecs.length > 0
  const hasRatings = conditionRatings && conditionRatings.length > 0
  const hasRestoration = restorationWork && restorationWork.length > 0
  const beforeImages = Array.isArray(beforeImage)
    ? beforeImage
    : beforeImage
      ? [beforeImage]
      : []
  const afterImages = Array.isArray(afterImage)
    ? afterImage
    : afterImage
      ? [afterImage]
      : []

  const beforeAfterPairs = beforeImages
    .slice(0, afterImages.length)
    .map((before, idx) => ({
      beforeUrl: buildImgUrl(before.url),
      afterUrl: buildImgUrl(afterImages[idx].url),
      beforeAlt: before.alternativeText ?? undefined,
      afterAlt: afterImages[idx].alternativeText ?? undefined,
    }))
  const hasSlider = beforeAfterPairs.length > 0

  return (
    <Layout locale={locale}>
      <main className="mx-auto max-w-5xl mb-10 px-4 py-10 sm:px-6 lg:px-8">
        {/* Back */}
        <Link
          href={`/${locale}/${shopPath}`}
          className="mb-8 inline-flex items-center font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.1em] text-neutral-400 transition-colors hover:text-black dark:hover:text-white"
        >
          ← {locale === 'fr' ? 'Retour à la boutique' : 'Back to shop'}
        </Link>

        {/* ── Header : galerie + meta ── */}
        <div className="grid grid-cols-1 gap-10 border-b border-neutral-200 pb-10 lg:grid-cols-2">
          <ProductImageGallery images={galleryImages} name={name} />

          <div className="flex flex-col">
            <div className="flex flex-col gap-1">
              {reference && (
                <p className="font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.08em] text-neutral-400">
                  REF — {reference}
                </p>
              )}
              <h1 className="text-[23px] font-medium leading-snug">{name}</h1>
              {(brand ?? product.category?.name) && (
                <p className="font-[family-name:var(--font-geist-mono)] text-[13px] uppercase tracking-[0.12em] text-neutral-500">
                  {brand ?? product.category?.name}
                </p>
              )}
            </div>

            {shortDescription && (
              <div className="my-6 lg:my-auto">
                <p className="mb-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.15em] text-neutral-400">
                  {locale === 'fr' ? 'A propos' : 'About'}
                </p>
                <p className="border-l-2 border-black pl-4 text-[14px] leading-[1.8] text-neutral-500">
                  {shortDescription}
                </p>
              </div>
            )}

            <div className="mt-2 flex flex-col gap-5 lg:mt-6">
              {/* Prix */}
              <div className="flex items-baseline gap-3">
                <span className="font-[family-name:var(--font-geist-mono)] text-[29px] font-light">
                  {formatPrice(price)}
                </span>
                {compareAtPrice && compareAtPrice > price && (
                  <span className="font-[family-name:var(--font-geist-mono)] text-sm text-neutral-400 line-through">
                    {formatPrice(compareAtPrice)}
                  </span>
                )}
              </div>

              {/* Badges */}
              {allBadges.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {allBadges.map((b, idx) => (
                    <span
                      key={`${b.label}-${idx}`}
                      className={`border px-[10px] py-[4px] font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] ${
                        b.highlight
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                          : 'border-neutral-300 text-neutral-500'
                      }`}
                    >
                      {b.label}
                    </span>
                  ))}
                </div>
              )}

              {/* CTA */}
              {isSoldOut ? (
                <div className="w-full border border-neutral-200 bg-neutral-200 px-6 py-3 text-center font-[family-name:var(--font-geist-mono)] text-[13px] uppercase tracking-[0.1em] text-neutral-600">
                  {locale === 'fr'
                    ? 'Ce produit est vendu'
                    : 'This product is sold'}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <AddToCartButton
                    product={{
                      id: product.id,
                      documentId: product.documentId,
                      name,
                      slug,
                      price,
                      imageUrl: firstImgUrl,
                      stock,
                      description: shortDescription ?? description ?? null,
                    }}
                  />
                  <WishlistButton productDocumentId={product.documentId} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Avant / Après ── */}
        {hasSlider && (
          <div className="mt-8">
            <SectionLabel>
              {locale === 'fr'
                ? 'Avant / Après réparation'
                : 'Before / After restoration'}
            </SectionLabel>
            <BeforeAfterSlider pairs={beforeAfterPairs} locale={locale} />
          </div>
        )}

        {/* ── Spécifications techniques ── */}
        {hasSpecs && (
          <div className="mt-8">
            <SectionLabel>
              {locale === 'fr'
                ? 'Spécifications techniques'
                : 'Technical specifications'}
            </SectionLabel>
            <div className="border border-neutral-200 divide-y divide-neutral-200 dark:border-neutral-700 dark:divide-neutral-700">
              {Array.from(
                { length: Math.ceil(technicalSpecs!.length / 2) },
                (_, rowIndex) => {
                  const left = technicalSpecs![rowIndex * 2]
                  const right = technicalSpecs![rowIndex * 2 + 1]
                  return (
                    <div
                      key={rowIndex}
                      className={`grid grid-cols-2 divide-x divide-neutral-200 dark:divide-neutral-700 ${
                        rowIndex % 2 === 0
                          ? 'bg-neutral-50 dark:bg-neutral-800/50'
                          : 'bg-white dark:bg-neutral-900'
                      }`}
                    >
                      <div className="flex items-baseline justify-between px-4 py-2.5 text-[14px]">
                        <span className="font-[family-name:var(--font-geist-mono)] text-[12px] text-neutral-400 dark:text-neutral-500">
                          {left.key}
                        </span>
                        <span className="font-medium dark:text-neutral-100">
                          {left.val}
                        </span>
                      </div>
                      {right ? (
                        <div className="flex items-baseline justify-between px-4 py-2.5 text-[14px]">
                          <span className="font-[family-name:var(--font-geist-mono)] text-[12px] text-neutral-400 dark:text-neutral-500">
                            {right.key}
                          </span>
                          <span className="font-medium dark:text-neutral-100">
                            {right.val}
                          </span>
                        </div>
                      ) : (
                        <div />
                      )}
                    </div>
                  )
                }
              )}
            </div>
          </div>
        )}

        {/* ── État général ── */}
        {hasRatings && (
          <div className="mt-8">
            <SectionLabel>
              {locale === 'fr' ? 'État général' : 'General condition'}
            </SectionLabel>
            <div className="flex flex-col gap-3">
              {conditionRatings!.map((r) => (
                <div key={r.label} className="flex items-center gap-4">
                  <span className="w-24 flex-shrink-0 font-[family-name:var(--font-geist-mono)] text-[12px] text-neutral-400 dark:text-neutral-500">
                    {r.label}
                  </span>
                  <div className="flex-1 h-[3px] bg-neutral-100 dark:bg-neutral-700">
                    <div
                      className="h-full bg-black dark:bg-white"
                      style={{ width: `${r.value}%` }}
                    />
                  </div>
                  <span className="w-20 text-right font-[family-name:var(--font-geist-mono)] text-[12px] text-neutral-600 dark:text-neutral-300">
                    {r.note}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Travaux de réparation ── */}
        {hasRestoration && (
          <div className="mt-8">
            <SectionLabel>
              {locale === 'fr' ? 'Travaux de réparation' : 'Repair work'}
            </SectionLabel>
            <div className="border border-neutral-200 p-5">
              <p className="mb-4 font-[family-name:var(--font-geist-mono)] text-[12px] text-neutral-400">
                {locale === 'fr'
                  ? "Effectués par l'horloger restaurateur — inclus dans le prix"
                  : 'Performed by the watchmaker — included in the price'}
              </p>
              <ul className="flex flex-col gap-2">
                {restorationWork!.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[14px]">
                    <span className="h-[6px] w-[6px] flex-shrink-0 bg-black" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── Histoire ── */}
        {description && (
          <div className="mt-8">
            <SectionLabel>
              {locale === 'fr' ? 'Histoire' : 'History'}
            </SectionLabel>
            <div
              className="border-l-2 border-black pl-4 text-[14px] leading-[1.8] text-neutral-500 [&_p]:mb-3 [&_p:last-child]:mb-0"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          </div>
        )}

        {/* ── Footer strip ── */}
        <div className="mt-12 grid grid-cols-4 divide-x divide-neutral-200 border-t border-neutral-200 pt-6">
          {[
            {
              val: '12 mois',
              key: locale === 'fr' ? 'Garantie' : 'Warranty',
              href: `/${locale}/garantie`,
            },
            {
              val: '48 h',
              key: locale === 'fr' ? 'Expédition' : 'Shipping',
              href: `/${locale}/livraison`,
            },
            {
              val: '14 jours',
              key: locale === 'fr' ? 'Retour' : 'Return',
              href: `/${locale}/livraison`,
            },
            {
              val: locale === 'fr' ? 'Sécurisé' : 'Secure',
              key: locale === 'fr' ? 'Paiement' : 'Payment',
              href:
                locale === 'fr'
                  ? 'https://stripe.com/fr/security'
                  : 'https://stripe.com/security',
            },
          ].map(({ val, key, href }) =>
            href ? (
              <Link
                key={key}
                href={href}
                {...(href.startsWith('http')
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
                className="flex flex-col items-center gap-1 px-2 text-center transition-opacity hover:opacity-60"
              >
                <span className="font-[family-name:var(--font-geist-mono)] text-[14px] font-medium">
                  {val}
                </span>
                <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-400">
                  {key}
                </span>
              </Link>
            ) : (
              <div
                key={key}
                className="flex flex-col items-center gap-1 px-2 text-center"
              >
                <span className="font-[family-name:var(--font-geist-mono)] text-[14px] font-medium">
                  {val}
                </span>
                <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-400">
                  {key}
                </span>
              </div>
            )
          )}
        </div>
      </main>
    </Layout>
  )
}
