import { getCurrentStrapiUser } from '@/lib/strapi-session-cookie'
import { isAdminUser } from '@/lib/is-admin-user'
import { strapiAuthGet } from '@/lib/strapi-auth-client'
import { buildWatchClaimUrl } from '@/lib/watch-claim-url'
import { CopyClaimLinkButton } from '@/components/espace-client/admin/CopyClaimLinkButton'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

interface WatchFileAdmin {
  documentId: string
  reference: string
  createdAt: string
  dateReception?: string
  dateMiseEnVente?: string
  product?: { name: string }
  customer?: { id: number; email: string; username: string }
}

interface StrapiList<T> {
  data: T[]
}

function formatDate(value?: string) {
  if (!value) return null
  return new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function AdminDossiersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const strapiUser = await getCurrentStrapiUser()

  if (!strapiUser) redirect(`/${locale}/espace-client/connexion`)
  if (!isAdminUser(strapiUser)) notFound()

  const { data } = await strapiAuthGet<StrapiList<WatchFileAdmin>>(
    '/watch-files?adminAll=true&sort=createdAt:desc&populate[product]=true&populate[customer]=true',
    0
  )

  const watchFiles = data?.data ?? []

  return (
    <div>
      <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-neutral-500">
        Admin
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[0.01em] text-neutral-900 dark:text-white">
        Tous les dossiers
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        {watchFiles.length} dossier{watchFiles.length !== 1 ? 's' : ''} au total
      </p>

      {watchFiles.length === 0 ? (
        <div className="mt-12 text-center border border-dashed border-neutral-200 bg-white py-16 px-6 dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-neutral-500 text-sm dark:text-neutral-400">
            Aucun dossier pour le moment.
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {watchFiles.map((wf) => {
            const primaryDate =
              wf.dateMiseEnVente ?? wf.dateReception ?? wf.createdAt
            const formattedDate = formatDate(primaryDate)
            let claimUrl: string | null = null

            try {
              claimUrl = buildWatchClaimUrl(wf.documentId, locale)
            } catch {
              claimUrl = null
            }

            return (
              <li key={wf.documentId}>
                <div className="group flex flex-col gap-3 border border-neutral-200 bg-white p-5 shadow-sm hover:border-neutral-400 hover:shadow-md transition-all dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-500">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate dark:text-white">
                        {wf.product?.name ?? wf.reference}
                      </p>
                      <p className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.12em] text-neutral-400 truncate">
                        Dossier {wf.reference}
                      </p>
                    </div>
                  </div>

                  {wf.customer && (
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">
                      Client&nbsp;: {wf.customer.email}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-3 text-xs text-neutral-400">
                    <span>{formattedDate ?? ''}</span>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-2">
                    <Link
                      href={`/${locale}/espace-client/mes-montres/${wf.documentId}`}
                      className="inline-flex items-center border border-neutral-400 px-3 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-700 transition-colors hover:border-black hover:text-black dark:border-neutral-600 dark:text-neutral-300 dark:hover:border-neutral-300 dark:hover:text-white"
                    >
                      Voir le dossier
                    </Link>
                    {claimUrl ? (
                      <CopyClaimLinkButton claimUrl={claimUrl} />
                    ) : null}
                    <Link
                      href={`/api/watch-claim/qr?watchFileDocumentId=${encodeURIComponent(wf.documentId)}&locale=${encodeURIComponent(locale)}`}
                      className="inline-flex items-center border border-neutral-400 px-3 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-700 transition-colors hover:border-black hover:text-black dark:border-neutral-600 dark:text-neutral-300 dark:hover:border-neutral-300 dark:hover:text-white"
                    >
                      Télécharger QR
                    </Link>
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
