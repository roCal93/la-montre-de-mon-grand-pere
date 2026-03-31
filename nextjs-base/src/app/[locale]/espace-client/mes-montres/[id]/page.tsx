import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { strapiAuthGet } from '@/lib/strapi-auth-client'
import Link from 'next/link'
import Image from 'next/image'
import { cleanImageUrl } from '@/lib/strapi'

interface MediaFile {
  url: string
  alternativeText?: string
  width?: number
  height?: number
}

interface WatchFile {
  documentId: string
  title: string
  repair_notes?: string
  createdAt: string
  updatedAt: string
  photos_before?: MediaFile[]
  photos_after?: MediaFile[]
  order?: { documentId: string; total: number; createdAt: string }
  product?: { name: string; slug: string }
  customer?: { id: number }
}

interface StrapiSingle<T> {
  data: T
}

export default async function WatchFileDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const session = await auth()
  if (!session) redirect(`/${locale}/espace-client/connexion`)

  const { data, error } = await strapiAuthGet<StrapiSingle<WatchFile>>(
    `/watch-files/${id}?populate[photos_before]=true&populate[photos_after]=true&populate[order]=true&populate[product]=true&populate[customer]=true`,
    0
  )

  const watchFile = data?.data
  if (!watchFile || error) notFound()

  const beforePhotos = watchFile.photos_before ?? []
  const afterPhotos = watchFile.photos_after ?? []

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link
          href={`/${locale}/espace-client/mes-montres`}
          className="text-sm text-stone-500 hover:text-stone-800"
        >
          ← Mes montres
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-serif font-bold text-stone-900">
          {watchFile.product?.name ?? watchFile.title}
        </h1>
        <p className="mt-1 text-sm text-stone-500">{watchFile.title}</p>
      </div>

      {/* Notes from the atelier */}
      {watchFile.repair_notes && (
        <section className="mt-6 rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-stone-800 mb-3">
            Notes de l&apos;atelier
          </h2>
          <div
            className="prose prose-sm prose-stone max-w-none text-stone-600"
            dangerouslySetInnerHTML={{ __html: watchFile.repair_notes }}
          />
        </section>
      )}

      {/* Photos before / after */}
      {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
        <section className="mt-6 rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-stone-800 mb-5">
            Photos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {beforePhotos.length > 0 && (
              <div>
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
                  Avant
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {beforePhotos.map((photo, i) => {
                    const src = cleanImageUrl(photo.url)
                    if (!src) return null
                    return (
                      <div
                        key={i}
                        className="relative aspect-square rounded-lg overflow-hidden bg-stone-100"
                      >
                        <Image
                          src={src}
                          alt={photo.alternativeText ?? `Photo avant ${i + 1}`}
                          fill
                          className="object-cover"
                          sizes="200px"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {afterPhotos.length > 0 && (
              <div>
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
                  Après
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {afterPhotos.map((photo, i) => {
                    const src = cleanImageUrl(photo.url)
                    if (!src) return null
                    return (
                      <div
                        key={i}
                        className="relative aspect-square rounded-lg overflow-hidden bg-stone-100"
                      >
                        <Image
                          src={src}
                          alt={photo.alternativeText ?? `Photo après ${i + 1}`}
                          fill
                          className="object-cover"
                          sizes="200px"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Linked order */}
      {watchFile.order && (
        <section className="mt-6 rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-stone-800 mb-2">
            Commande associée
          </h2>
          <Link
            href={`/${locale}/espace-client/commandes/${watchFile.order.documentId}`}
            className="text-sm text-amber-800 hover:underline"
          >
            Commande #{watchFile.order.documentId.slice(-8).toUpperCase()}
          </Link>
        </section>
      )}
    </div>
  )
}
