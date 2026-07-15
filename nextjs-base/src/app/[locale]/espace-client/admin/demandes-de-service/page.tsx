import { getCurrentStrapiUser } from '@/lib/strapi-session-cookie'
import { isAdminUser } from '@/lib/is-admin-user'
import { strapiAuthGet } from '@/lib/strapi-auth-client'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

interface ServiceRequestAdmin {
  documentId: string
  type: string
  description: string
  status: string
  createdAt: string
  admin_response?: string
  customer?: { id: number; email?: string; username?: string }
  watch_file?: {
    documentId: string
    reference?: string
    product?: { name?: string }
  }
}

interface StrapiList<T> {
  data: T[]
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'quote_sent', label: 'Devis envoyé' },
  { value: 'accepted', label: 'Acceptée' },
  { value: 'completed', label: 'Terminée' },
  { value: 'cancelled', label: 'Annulée' },
] as const

const TYPE_LABELS: Record<string, string> = {
  retour_garantie: 'Retour sous garantie',
  reparation: 'Réparation',
  nettoyage: 'Nettoyage',
  autre: 'Autre',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  quote_sent: 'Devis envoyé',
  accepted: 'Acceptée',
  completed: 'Terminée',
  cancelled: 'Annulée',
}

const STATUS_COLORS: Record<string, string> = {
  pending:
    'bg-stone-100 text-stone-600 dark:bg-neutral-700 dark:text-neutral-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  quote_sent:
    'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  accepted:
    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  completed:
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

function formatDate(value?: string) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function AdminDemandesDeServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ status?: string }>
}) {
  const { locale } = await params
  const { status } = await searchParams
  const activeStatus =
    status && STATUS_OPTIONS.some((item) => item.value === status)
      ? status
      : 'all'

  const strapiUser = await getCurrentStrapiUser()

  if (!strapiUser) redirect(`/${locale}/espace-client/connexion`)
  if (!isAdminUser(strapiUser)) notFound()

  const query = new URLSearchParams()
  query.set('adminAll', 'true')
  query.set('sort', 'createdAt:desc')
  query.set('populate[customer][fields][0]', 'email')
  query.set('populate[customer][fields][1]', 'username')
  query.set('populate[watch_file][fields][0]', 'reference')
  query.set('populate[watch_file][populate][product][fields][0]', 'name')

  if (activeStatus !== 'all') {
    query.set('filters[status][$eq]', activeStatus)
  }

  const { data } = await strapiAuthGet<StrapiList<ServiceRequestAdmin>>(
    `/service-requests?${query.toString()}`,
    0
  )

  const requests = data?.data ?? []

  return (
    <div>
      <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-neutral-500">
        Admin
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[0.01em] text-neutral-900 dark:text-white">
        Demandes de service
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        {requests.length} demande{requests.length !== 1 ? 's' : ''}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((option) => {
          const isActive = activeStatus === option.value
          const href =
            option.value === 'all'
              ? `/${locale}/espace-client/admin/demandes-de-service`
              : `/${locale}/espace-client/admin/demandes-de-service?status=${option.value}`

          return (
            <Link
              key={option.value}
              href={href}
              className={[
                'inline-flex items-center border px-3 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] transition-colors',
                isActive
                  ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                  : 'border-neutral-300 text-neutral-700 hover:border-black hover:text-black dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-400 dark:hover:text-white',
              ].join(' ')}
            >
              {option.label}
            </Link>
          )
        })}
      </div>

      {requests.length === 0 ? (
        <div className="mt-8 border border-dashed border-neutral-200 bg-white py-16 px-6 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-neutral-500 text-sm dark:text-neutral-400">
            Aucune demande de service sur ce filtre.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {requests.map((request) => {
            const watchLabel =
              request.watch_file?.product?.name ??
              request.watch_file?.reference ??
              'Montre non renseignée'

            return (
              <li
                key={request.documentId}
                className="border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                      {TYPE_LABELS[request.type] ?? request.type}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      Client:{' '}
                      {request.customer?.email ??
                        request.customer?.username ??
                        'Inconnu'}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      Montre: {watchLabel}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                      Créée le {formatDate(request.createdAt)}
                    </p>
                    <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">
                      {request.description}
                    </p>
                    {request.admin_response && (
                      <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 dark:bg-amber-950 dark:border-amber-800">
                        <p className="text-xs font-medium text-amber-900 mb-1 dark:text-amber-300">
                          Dernière réponse atelier
                        </p>
                        <p className="text-sm text-amber-800 dark:text-amber-400">
                          {request.admin_response}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:items-end">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[request.status] ?? 'bg-stone-100 text-stone-600'}`}
                    >
                      {STATUS_LABELS[request.status] ?? request.status}
                    </span>
                    <Link
                      href={`/${locale}/espace-client/admin/demandes-de-service/${request.documentId}`}
                      className="inline-flex items-center border border-neutral-400 px-3 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-700 transition-colors hover:border-black hover:text-black dark:border-neutral-600 dark:text-neutral-300 dark:hover:border-neutral-300 dark:hover:text-white"
                    >
                      Traiter
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
