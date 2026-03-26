import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { strapiAuthGet } from '@/lib/strapi-auth-client'
import Link from 'next/link'
import Image from 'next/image'
import { cleanImageUrl } from '@/lib/strapi'
import { formatPrice } from '@/lib/currency'
import { WishlistRemoveButton } from '@/components/espace-client/WishlistRemoveButton'

interface Product {
  documentId: string
  name: string
  slug: string
  price: number
  stock: number
  images?: { url: string; alternativeText?: string }[]
}

interface WishlistItem {
  documentId: string
  product?: Product
}

interface StrapiList<T> {
  data: T[]
}

export default async function FavorisPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session) redirect(`/${locale}/espace-client/connexion`)

  const { data } = await strapiAuthGet<StrapiList<WishlistItem>>(
    '/wishlist-items?populate[product][populate]=images',
    0
  )

  const items = data?.data ?? []

  return (
    <div>
      <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-neutral-500">
        Espace client
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[0.01em] text-neutral-900">
        Mes favoris
      </h1>
      <p className="mt-1 text-sm text-neutral-500 mb-8">
        {items.length} montre{items.length !== 1 ? 's' : ''} sauvegardée
        {items.length !== 1 ? 's' : ''}
      </p>

      {items.length === 0 ? (
        <div className="border border-dashed border-neutral-200 bg-white py-16 px-6 text-center">
          <p className="text-neutral-500 text-sm">
            Aucun favori pour le moment.
          </p>
          <Link
            href={`/${locale}/boutique`}
            className="mt-4 inline-block font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.1em] text-neutral-800 transition-colors hover:text-black"
          >
            Découvrir la boutique
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const product = item.product
            if (!product) return null
            const imgUrl = cleanImageUrl(product.images?.[0]?.url)

            return (
              <li
                key={item.documentId}
                className="group border border-neutral-200 bg-white shadow-sm overflow-hidden hover:border-neutral-400 hover:shadow-md transition-all"
              >
                <Link href={`/${locale}/boutique/${product.slug}`}>
                  <div className="relative aspect-square bg-stone-100">
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
                    {product.stock === 0 && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-stone-500 shadow">
                          Épuisé
                        </span>
                      </div>
                    )}
                  </div>
                </Link>

                <div className="p-4">
                  <Link href={`/${locale}/boutique/${product.slug}`}>
                    <p className="text-sm font-semibold text-neutral-900 truncate hover:text-black transition-colors">
                      {product.name}
                    </p>
                  </Link>
                  <p className="mt-1 text-sm font-medium text-neutral-700">
                    {formatPrice(product.price)}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Link
                      href={`/${locale}/boutique/${product.slug}`}
                      className="flex-1 text-center border border-black bg-black px-3 py-2 font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-neutral-900 transition-colors"
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
