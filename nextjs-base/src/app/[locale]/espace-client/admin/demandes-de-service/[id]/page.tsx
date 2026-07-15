import { getCurrentStrapiUser } from '@/lib/strapi-session-cookie'
import { isAdminUser } from '@/lib/is-admin-user'
import { strapiAuthGet } from '@/lib/strapi-auth-client'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ServiceRequestAdminForm } from './ServiceRequestAdminForm'

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

interface StrapiEntity<T> {
  data: T
}

const TYPE_LABELS: Record<string, string> = {
  retour_garantie: 'Retour sous garantie',
  reparation: 'Réparation',
  nettoyage: 'Nettoyage',
  autre: 'Autre',
}

function formatDate(value?: string) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function AdminDemandeDeServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const strapiUser = await getCurrentStrapiUser()

  if (!strapiUser) redirect(`/${locale}/espace-client/connexion`)
  if (!isAdminUser(strapiUser)) notFound()

  const query = new URLSearchParams()
  query.set('populate[customer][fields][0]', 'email')
  query.set('populate[customer][fields][1]', 'username')
  query.set('populate[watch_file][fields][0]', 'reference')
  query.set('populate[watch_file][populate][product][fields][0]', 'name')

  const { data, error } = await strapiAuthGet<
    StrapiEntity<ServiceRequestAdmin>
  >(`/service-requests/${id}?${query.toString()}`, 0)

  if (error || !data?.data) notFound()

  const request = data.data
  const watchLabel =
    request.watch_file?.product?.name ??
    request.watch_file?.reference ??
    'Montre non renseignée'

  return (
    <div>
      <div className="mb-5">
        <Link
          href={`/${locale}/espace-client/admin/demandes-de-service`}
          className="text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          ← Demandes de service
        </Link>
      </div>

      <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-neutral-500">
        Admin
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[0.01em] text-neutral-900 dark:text-white">
        Traiter la demande
      </h1>

      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section className="border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
            {TYPE_LABELS[request.type] ?? request.type}
          </h2>
          <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
            {request.description}
          </p>
        </section>

        <aside className="border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-xs uppercase tracking-[0.08em] text-neutral-500">
            Client
          </p>
          <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
            {request.customer?.email ?? request.customer?.username ?? 'Inconnu'}
          </p>

          <p className="mt-4 text-xs uppercase tracking-[0.08em] text-neutral-500">
            Montre
          </p>
          <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
            {watchLabel}
          </p>

          <p className="mt-4 text-xs uppercase tracking-[0.08em] text-neutral-500">
            Créée le
          </p>
          <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">
            {formatDate(request.createdAt)}
          </p>
        </aside>
      </div>

      <div className="mt-6">
        <ServiceRequestAdminForm
          locale={locale}
          request={{
            documentId: request.documentId,
            type: request.type,
            status: request.status,
            admin_response: request.admin_response,
            customerEmail: request.customer?.email,
          }}
        />
      </div>
    </div>
  )
}
