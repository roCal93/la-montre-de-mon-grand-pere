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
  status: 'waiting' | 'in_progress' | 'completed'
  restoration_notes?: string
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

const STATUS_LABELS: Record<string, string> = {
  waiting: 'En attente',
  in_progress: 'En cours de restauration',
  completed: 'Restauration terminée',
}

const STATUS_COLORS: Record<string, string> = {
  waiting: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
}

const TIMELINE_STEPS = [
  { key: 'waiting', label: 'Dossier ouvert' },
  { key: 'in_progress', label: 'En cours de restauration' },
  { key: 'completed', label: 'Restauration terminée' },
]

function statusIndex(status: string): number {
  const idx = TIMELINE_STEPS.findIndex((s) => s.key === status)
  return idx === -1 ? 0 : idx
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

  const currentStep = statusIndex(watchFile.status)
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

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">
            {watchFile.title}
          </h1>
          {watchFile.product?.name && (
            <p className="mt-1 text-sm text-stone-500">
              {watchFile.product.name}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[watchFile.status] ?? 'bg-stone-100 text-stone-600'}`}
        >
          {STATUS_LABELS[watchFile.status] ?? watchFile.status}
        </span>
      </div>

      {/* Timeline */}
      <section className="mt-8 rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-stone-800 mb-6">
          Suivi de restauration
        </h2>
        <ol className="relative border-l border-stone-200 space-y-6 ml-2">
          {TIMELINE_STEPS.map((step, i) => {
            const isDone = i <= currentStep
            return (
              <li key={step.key} className="ml-6">
                <span
                  className={[
                    'absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-white text-xs',
                    isDone
                      ? 'bg-amber-700 text-white'
                      : 'bg-stone-200 text-stone-400',
                  ].join(' ')}
                >
                  {isDone ? '✓' : i + 1}
                </span>
                <p
                  className={`text-sm font-medium ${isDone ? 'text-stone-900' : 'text-stone-400'}`}
                >
                  {step.label}
                </p>
              </li>
            )
          })}
        </ol>
      </section>

      {/* Notes from the atelier */}
      {watchFile.restoration_notes && (
        <section className="mt-6 rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-stone-800 mb-3">
            Notes de l&apos;atelier
          </h2>
          <div
            className="prose prose-sm prose-stone max-w-none text-stone-600"
            dangerouslySetInnerHTML={{ __html: watchFile.restoration_notes }}
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
            Commande #{watchFile.order.documentId.slice(-8).toUpperCase()} →
          </Link>
        </section>
      )}
    </div>
  )
}
