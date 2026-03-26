import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { strapiAuthGet } from '@/lib/strapi-auth-client'
import Link from 'next/link'

interface WatchFile {
  documentId: string
  title: string
  watch_status: 'waiting' | 'in_progress' | 'completed'
  createdAt: string
  product?: { name: string }
}

interface StrapiList<T> {
  data: T[]
}

const STATUS_LABELS: Record<string, string> = {
  waiting: 'En attente',
  in_progress: 'En cours',
  completed: 'Terminé',
}

const STATUS_COLORS: Record<string, string> = {
  waiting: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
}

export default async function MesMontrePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session) redirect(`/${locale}/espace-client/connexion`)

  const { data } = await strapiAuthGet<StrapiList<WatchFile>>(
    '/watch-files?sort=createdAt:desc&populate[product]=true',
    0
  )

  const watchFiles = data?.data ?? []

  return (
    <div>
      <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-neutral-500">
        Espace client
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[0.01em] text-neutral-900">
        Mes montres
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Dossiers de restauration de vos montres
      </p>

      {watchFiles.length === 0 ? (
        <div className="mt-12 text-center border border-dashed border-neutral-200 bg-white py-16 px-6">
          <p className="text-neutral-500 text-sm">
            Aucun dossier de restauration pour le moment.
          </p>
          <p className="mt-2 text-xs text-neutral-400">
            Vos dossiers apparaîtront ici dès qu&apos;un suivi sera ouvert par
            notre atelier.
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {watchFiles.map((wf) => (
            <li key={wf.documentId}>
              <Link
                href={`/${locale}/espace-client/mes-montres/${wf.documentId}`}
                className="group flex flex-col gap-3 border border-neutral-200 bg-white p-5 shadow-sm hover:border-neutral-400 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">
                      {wf.title}
                    </p>
                    {wf.product?.name && (
                      <p className="text-xs text-neutral-400 truncate mt-0.5">
                        {wf.product.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[wf.watch_status] ?? 'bg-stone-100 text-stone-600'}`}
                  >
                    {STATUS_LABELS[wf.watch_status] ?? wf.watch_status}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {new Date(wf.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>

                <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-600 group-hover:text-black transition-colors mt-1">
                  Voir le dossier
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
