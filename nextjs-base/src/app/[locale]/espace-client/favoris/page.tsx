import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { cleanImageUrl } from '@/lib/strapi'
import { formatPrice } from '@/lib/currency'
import { WishlistRemoveButton } from '@/components/espace-client/WishlistRemoveButton'
import {
  getCurrentStrapiUser,
  getStrapiSessionJwt,
} from '@/lib/strapi-session-cookie'

async function safeAuth() {
  try {
    return await auth()
  } catch {
    return null
  }
}

type ProductReference = {
  id?: number
  documentId?: string
}

async function getStrapiHeaders(
  customerId: string
): Promise<Record<string, string> | null> {
  const apiToken = process.env.STRAPI_WRITE_API_TOKEN
  if (apiToken) {
    return {
      Authorization: `Bearer ${apiToken}`,
      'x-hakuna-customer-id': customerId,
    }
  }

  const strapiJwt = await getStrapiSessionJwt()
  if (strapiJwt) {
    return { Authorization: `Bearer ${strapiJwt}` }
  }

  return null
}

async function fetchFavoris(
  customerId: string
): Promise<{ data: WishlistItem[] }> {
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL
  if (!strapiUrl) return { data: [] }

  const headers = await getStrapiHeaders(customerId)

  if (!headers) return { data: [] }

  try {
    const res = await fetch(
      `${strapiUrl}/api/wishlist-items?populate[product][populate]=images`,
      {
        headers,
        cache: 'no-store',
      }
    )
    if (!res.ok) return { data: [] }
    const json = (await res.json()) as { data?: WishlistItem[] }
    return { data: json?.data ?? [] }
  } catch {
    return { data: [] }
  }
}

function getWishlistProductReference(
  raw: WishlistItem['product']
): ProductReference | null {
  if (!raw) return null

  if (typeof raw === 'string') {
    const normalized = raw.trim()
    if (!normalized) return null

    const parsed = Number.parseInt(normalized, 10)
    if (Number.isFinite(parsed) && String(parsed) === normalized) {
      return { id: parsed }
    }

    return { documentId: normalized }
  }

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return { id: raw }
  }

  if (typeof raw !== 'object') return null

  if ('documentId' in raw || 'id' in raw) {
    const direct = raw as { documentId?: string; id?: number }
    const ref: ProductReference = {
      documentId: direct.documentId,
      id: direct.id,
    }
    return ref.documentId || typeof ref.id === 'number' ? ref : null
  }

  const wrapped = (raw as { data?: unknown }).data
  if (!wrapped || typeof wrapped !== 'object') return null

  if ('documentId' in wrapped || 'id' in wrapped) {
    const fromData = wrapped as { documentId?: string; id?: number }
    const ref: ProductReference = {
      documentId: fromData.documentId,
      id: fromData.id,
    }
    return ref.documentId || typeof ref.id === 'number' ? ref : null
  }

  return null
}

async function fetchProductByReference(
  ref: ProductReference,
  customerId: string
): Promise<Product | null> {
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL
  if (!strapiUrl) return null

  const headers = await getStrapiHeaders(customerId)
  if (!headers) return null

  const imageFields =
    'populate[images][fields][0]=url&populate[images][fields][1]=alternativeText'
  const commonFields =
    'fields[0]=documentId&fields[1]=name&fields[2]=slug&fields[3]=price&fields[4]=active'

  let url: string | null = null
  if (ref.documentId) {
    url = `${strapiUrl}/api/products?filters[documentId][$eq]=${encodeURIComponent(ref.documentId)}&pagination[limit]=1&${commonFields}&${imageFields}`
  } else if (typeof ref.id === 'number') {
    url = `${strapiUrl}/api/products?filters[id][$eq]=${ref.id}&pagination[limit]=1&${commonFields}&${imageFields}`
  }

  if (!url) return null

  try {
    const res = await fetch(url, { headers, cache: 'no-store' })
    if (!res.ok) return null

    const json = (await res.json()) as
      | { data?: Product[] }
      | { data?: Product }
      | null

    const data = json?.data
    if (Array.isArray(data)) {
      return data[0] ?? null
    }

    return data ?? null
  } catch {
    return null
  }
}

interface Product {
  documentId: string
  name: string
  slug: string
  price: number
  active: boolean
  images?: { url: string; alternativeText?: string }[]
}

interface WishlistItem {
  documentId: string
  product?:
    | string
    | number
    | Product
    | {
        data?:
          | Product
          | {
              documentId?: string
              attributes?: {
                name?: string
                slug?: string
                price?: number
                active?: boolean
                images?: {
                  data?: Array<{
                    url?: string
                    alternativeText?: string
                    attributes?: {
                      url?: string
                      alternativeText?: string
                    }
                  }>
                }
              }
            }
      }
}

function normalizeProduct(raw: WishlistItem['product']): Product | null {
  if (!raw || typeof raw !== 'object') return null

  // Strapi v5 flat relation
  if ('slug' in raw && typeof raw.slug === 'string') {
    return raw as Product
  }

  // Strapi relation wrapper (v4 or mixed payloads)
  const wrapped = (raw as { data?: unknown }).data
  if (!wrapped || typeof wrapped !== 'object') return null

  if (
    'slug' in wrapped &&
    typeof (wrapped as { slug?: unknown }).slug === 'string'
  ) {
    return wrapped as Product
  }

  const withAttributes = wrapped as {
    documentId?: string
    attributes?: {
      name?: string
      slug?: string
      price?: number
      active?: boolean
      images?: {
        data?: Array<{
          url?: string
          alternativeText?: string
          attributes?: {
            url?: string
            alternativeText?: string
          }
        }>
      }
    }
  }

  const attrs = withAttributes.attributes
  if (!attrs?.slug) return null

  return {
    documentId: withAttributes.documentId ?? '',
    name: attrs.name ?? '',
    slug: attrs.slug,
    price: attrs.price ?? 0,
    active: attrs.active ?? true,
    images: (attrs.images?.data ?? [])
      .map((img) => ({
        url: img.url ?? img.attributes?.url ?? '',
        alternativeText: img.alternativeText ?? img.attributes?.alternativeText,
      }))
      .filter((img) => Boolean(img.url)),
  }
}

export default async function FavorisPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await safeAuth()
  const strapiUser = await getCurrentStrapiUser()
  const customerId =
    session?.user?.id ?? (strapiUser ? String(strapiUser.id) : null)

  if (!customerId) redirect(`/${locale}/espace-client/connexion`)

  const { data: items } = await fetchFavoris(customerId)

  const entriesWithHydration = await Promise.all(
    items.map(async (item) => {
      const normalized = normalizeProduct(item.product)
      if (normalized?.slug) {
        return { item, product: normalized }
      }

      const ref = getWishlistProductReference(item.product)
      if (!ref) {
        return { item, product: null }
      }

      const hydrated = await fetchProductByReference(ref, customerId)
      return { item, product: hydrated }
    })
  )

  const visibleItems = entriesWithHydration.filter(
    (entry): entry is { item: WishlistItem; product: Product } =>
      Boolean(entry.product?.slug)
  )

  return (
    <div>
      <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-neutral-500">
        Espace client
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[0.01em] text-neutral-900 dark:text-white">
        Mes favoris
      </h1>
      <p className="mt-1 text-sm text-neutral-500 mb-8">
        {visibleItems.length} montre{visibleItems.length !== 1 ? 's' : ''}{' '}
        sauvegardée{visibleItems.length !== 1 ? 's' : ''}
      </p>

      {visibleItems.length === 0 ? (
        <div className="border border-dashed border-neutral-200 bg-white py-16 px-6 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-neutral-500 text-sm dark:text-neutral-400">
            Aucun favori pour le moment.
          </p>
          <Link
            href={`/${locale}/boutique`}
            className="mt-4 inline-block font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.1em] text-neutral-800 transition-colors hover:text-black dark:text-neutral-200 dark:hover:text-white"
          >
            Découvrir la boutique
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map(({ item, product }) => {
            const imgUrl = cleanImageUrl(product.images?.[0]?.url)

            return (
              <li
                key={item.documentId}
                className="group border border-neutral-200 bg-white shadow-sm overflow-hidden hover:border-neutral-400 hover:shadow-md transition-all dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-500"
              >
                <Link href={`/${locale}/boutique/${product.slug}`}>
                  <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-800">
                    {imgUrl ? (
                      <Image
                        src={imgUrl}
                        alt={
                          product.images?.[0]?.alternativeText ?? product.name
                        }
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, 280px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-neutral-100" />
                    )}
                    {!product.active && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-neutral-500 shadow dark:text-neutral-300">
                          Épuisé
                        </span>
                      </div>
                    )}
                  </div>
                </Link>

                <div className="p-4">
                  <Link href={`/${locale}/boutique/${product.slug}`}>
                    <p className="text-sm font-semibold text-neutral-900 truncate hover:text-black transition-colors dark:text-white dark:hover:text-neutral-300">
                      {product.name}
                    </p>
                  </Link>
                  <p className="mt-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {formatPrice(product.price)}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Link
                      href={`/${locale}/boutique/${product.slug}`}
                      className="flex-1 text-center border border-black bg-black px-3 py-2 font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-neutral-800 transition-colors dark:border-white dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                    >
                      Voir la montre
                    </Link>
                    <WishlistRemoveButton itemId={item.documentId} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
