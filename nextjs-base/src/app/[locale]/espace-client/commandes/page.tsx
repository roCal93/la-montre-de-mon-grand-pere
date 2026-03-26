import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/lib/currency'
import { cleanImageUrl } from '@/lib/strapi'

interface LineItem {
  productName: string
  productSlug: string
  quantity: number
  unitPrice: number
  total: number
}

interface Order {
  documentId: string
  status: string
  createdAt: string
  total: number
  lineItems: LineItem[]
}

interface StrapiList<T> {
  data: T[]
}

interface ProductImage {
  formats?: { small?: { url: string }; thumbnail?: { url: string } }
  url: string
}

interface Product {
  slug: string
  images: ProductImage[]
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  paid: 'Payé',
  shipped: 'Expédié',
  cancelled: 'Annulé',
  refunded: 'Remboursé',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-stone-100 text-stone-600',
  paid: 'bg-green-100 text-green-800',
  shipped: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-orange-100 text-orange-800',
}

export default async function CommandesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session) redirect(`/${locale}/espace-client/connexion`)

  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL
  const token = process.env.STRAPI_API_TOKEN
  const headers = { Authorization: `Bearer ${token}` }

  const res = await fetch(
    `${strapiUrl}/api/orders?filters[customerEmail][$eq]=${encodeURIComponent(session.user.email)}&sort=createdAt:desc&populate=*`,
    { headers, cache: 'no-store' }
  )
  const json = res.ok ? ((await res.json()) as StrapiList<Order>) : { data: [] }
  const orders = json.data ?? []

  // Collect unique product slugs to fetch their images in one batch
  const allSlugs = [
    ...new Set(
      orders.flatMap((o) => o.lineItems?.map((i) => i.productSlug) ?? [])
    ),
  ]
  const imageMap: Record<string, string | undefined> = {}

  if (allSlugs.length > 0) {
    const slugParams = allSlugs
      .map((s, idx) => `filters[slug][$in][${idx}]=${encodeURIComponent(s)}`)
      .join('&')
    const prodRes = await fetch(
      `${strapiUrl}/api/products?${slugParams}&fields[0]=slug&populate[images]=true`,
      { headers, cache: 'no-store' }
    )
    if (prodRes.ok) {
      const prodJson = (await prodRes.json()) as StrapiList<Product>
      for (const p of prodJson.data ?? []) {
        const img = p.images?.[0]
        const url =
          img?.formats?.small?.url ?? img?.formats?.thumbnail?.url ?? img?.url
        imageMap[p.slug] = cleanImageUrl(url)
      }
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-serif font-bold text-stone-900">
        Mes commandes
      </h1>

      {orders.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-stone-500">Aucune commande pour le moment.</p>
          <Link
            href={`/${locale}/boutique`}
            className="mt-4 inline-block text-sm text-amber-800 hover:underline"
          >
            Découvrir la boutique →
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((order) => {
            const firstItem = order.lineItems?.[0]
            const imgUrl = firstItem
              ? imageMap[firstItem.productSlug]
              : undefined
            const totalQty =
              order.lineItems?.reduce((s, i) => s + i.quantity, 0) ?? 0
            const otherCount = (order.lineItems?.length ?? 0) - 1

            return (
              <li key={order.documentId}>
                <Link
                  href={`/${locale}/espace-client/commandes/${order.documentId}`}
                  className="flex items-center gap-4 rounded-xl border border-stone-100 bg-white p-4 shadow-sm hover:border-amber-200 hover:shadow-md transition-all"
                >
                  {/* Product thumbnail */}
                  <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-stone-100">
                    {imgUrl ? (
                      <Image
                        src={imgUrl}
                        alt={firstItem?.productName ?? ''}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-300 text-xl">
                        ⌚
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-900 truncate">
                      {firstItem?.productName ?? '—'}
                      {otherCount > 0 && (
                        <span className="ml-1.5 text-xs font-normal text-stone-400">
                          +{otherCount} autre{otherCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {totalQty > 1 && ` · ${totalQty} articles`}
                    </p>
                    <p className="mt-1 text-xs font-mono text-stone-300">
                      #{order.documentId.slice(-8).toUpperCase()}
                    </p>
                  </div>

                  {/* Status + price */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-stone-100 text-stone-600'}`}
                    >
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    <p className="text-sm font-bold text-stone-900">
                      {formatPrice(order.total)}
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
