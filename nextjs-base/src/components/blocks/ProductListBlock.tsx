import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/lib/currency'

// Strapi v5 — flat response format (no attributes wrapper)
interface StrapiImage {
  id: number
  url: string
  alternativeText: string | null
}

interface StrapiCategory {
  id: number
  name: string
  slug: string
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
}

async function fetchProducts(
  locale: string,
  categorySlug: string | null,
  maxItems: number
): Promise<StrapiProduct[]> {
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL
  const token = process.env.STRAPI_API_TOKEN

  const url = new URL(`${strapiUrl}/api/products`)
  url.searchParams.set('locale', locale)
  if (categorySlug) {
    url.searchParams.set('filters[category][slug][$eq]', categorySlug)
  }
  url.searchParams.set('populate[images][fields][0]', 'url')
  url.searchParams.set('populate[images][fields][1]', 'alternativeText')
  url.searchParams.set('populate[category][fields][0]', 'name')
  url.searchParams.set('populate[category][fields][1]', 'slug')
  url.searchParams.set('fields[0]', 'name')
  url.searchParams.set('fields[1]', 'slug')
  url.searchParams.set('fields[2]', 'price')
  url.searchParams.set('fields[3]', 'compareAtPrice')
  url.searchParams.set('fields[4]', 'active')
  url.searchParams.set('sort', 'createdAt:desc')
  url.searchParams.set('pagination[pageSize]', String(maxItems))

  const res = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    next: { tags: ['products'] },
  })

  if (!res.ok) return []
  const json = (await res.json()) as { data: StrapiProduct[] }
  return json.data ?? []
}

interface Props {
  title?: string | null
  subtitle?: string | null
  maxItems?: number | null
  showFilters?: boolean
  // Strapi v5 flat category (may come as direct object or legacy data wrapper)
  category?:
    | StrapiCategory
    | { data?: { attributes?: { slug?: string } } | null }
    | null
  locale?: string
}

export default async function ProductListBlock({
  title,
  subtitle,
  maxItems: maxItemsProp,
  showFilters,
  category,
  locale = 'fr',
}: Props) {
  // Support both Strapi v5 flat format and legacy v4 format
  const categorySlug =
    (category as StrapiCategory | null)?.slug ??
    (category as { data?: { attributes?: { slug?: string } } | null } | null)
      ?.data?.attributes?.slug ??
    null
  const maxItems = maxItemsProp ?? 12
  const products = await fetchProducts(locale, categorySlug, maxItems)

  const buildImgUrl = (rawUrl: string) =>
    rawUrl.startsWith('http')
      ? rawUrl
      : `${process.env.NEXT_PUBLIC_STRAPI_URL}${rawUrl}`

  const shopPath = locale === 'fr' ? 'boutique' : 'shop'

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 dark:invert">
      {(title || subtitle) && (
        <div className="mb-8 text-center">
          {title && (
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
            </h2>
          )}
          {subtitle && <p className="mt-2 text-neutral-600">{subtitle}</p>}
        </div>
      )}

      {products.length === 0 ? (
        <p className="text-center text-neutral-500">
          {locale === 'fr'
            ? 'Aucun produit disponible.'
            : 'No products available.'}
        </p>
      ) : (
        <ul
          className={`grid gap-10 ${products.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : products.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-xl mx-auto' : products.length === 3 ? 'grid-cols-1 sm:grid-cols-3 max-w-4xl mx-auto' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}
        >
          {products.map((product) => {
            const img = product.images?.[0]
            const imgUrl = img ? buildImgUrl(img.url) : null

            const isSoldOut = !product.active

            return (
              <li
                key={product.id}
                className="mx-auto w-full max-w-[280px] sm:max-w-none"
              >
                <Link
                  href={`/${locale}/${shopPath}/${product.slug}`}
                  className="group block"
                >
                  <article className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-neutral-300 group-hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                    <div className="relative aspect-square w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                      {imgUrl && (
                        <Image
                          src={imgUrl}
                          alt={img?.alternativeText ?? product.name}
                          fill
                          className={`object-cover transition-transform duration-500 group-hover:scale-[1.03] ${
                            isSoldOut ? 'opacity-60' : ''
                          }`}
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/[0.03] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      {isSoldOut && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">
                            {locale === 'fr' ? 'Vendu' : 'Sold'}
                          </span>
                        </div>
                      )}
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
                          product.compareAtPrice > product.price && (
                            <span className="text-[12px] text-neutral-400 line-through">
                              {formatPrice(product.compareAtPrice)}
                            </span>
                          )}
                      </div>
                    </div>
                  </article>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {showFilters && (
        <div className="mt-8 text-center">
          <Link
            href={`/${locale}/${shopPath}`}
            className="inline-block rounded-md border px-5 py-2 text-sm font-medium hover:bg-neutral-50 transition-colors"
          >
            {locale === 'fr' ? 'Voir tous les produits' : 'View all products'}
          </Link>
        </div>
      )}
    </section>
  )
}
