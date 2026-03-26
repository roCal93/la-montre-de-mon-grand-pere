import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { strapiAuthGet } from '@/lib/strapi-auth-client'
import Link from 'next/link'

interface StrapiList<T> {
  data: T[]
}

interface Order {
  documentId: string
  status: string
  createdAt: string
  total: number
  lineItems: { quantity: number }[]
}

interface WatchFile {
  documentId: string
  title: string
  status: 'waiting' | 'in_progress' | 'completed'
}

interface ServiceRequest {
  documentId: string
  type: string
  status: string
}

const STATUS_LABELS: Record<string, string> = {
  waiting: 'En attente',
  in_progress: 'En cours',
  completed: 'Terminé',
  pending: 'En attente',
  paid: 'Payé',
  shipped: 'Expédié',
  cancelled: 'Annulé',
  refunded: 'Remboursé',
}

const STATUS_COLORS: Record<string, string> = {
  waiting: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-stone-100 text-stone-600',
  paid: 'bg-green-100 text-green-800',
  shipped: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-orange-100 text-orange-800',
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string
  value: number | string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-stone-100 bg-white p-6 shadow-sm hover:border-amber-200 hover:shadow-md transition-all"
    >
      <p className="text-2xl font-bold text-stone-900">{value}</p>
      <p className="mt-1 text-sm text-stone-500 group-hover:text-stone-700 transition-colors">
        {label}
      </p>
    </Link>
  )
}

export default async function TableauDeBordPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session) redirect(`/${locale}/espace-client/connexion`)

  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL
  const token = process.env.STRAPI_API_TOKEN

  const [ordersRes, watchFilesRes, serviceRequestsRes] = await Promise.all([
    fetch(
      `${strapiUrl}/api/orders?filters[customerEmail][$eq]=${encodeURIComponent(session.user.email)}&sort=createdAt:desc&pagination[limit]=3&populate=*`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    ).then((r) =>
      r.ok ? (r.json() as Promise<StrapiList<Order>>) : { data: [] }
    ),
    strapiAuthGet<StrapiList<WatchFile>>(
      '/watch-files?sort=createdAt:desc&pagination[limit]=5',
      0
    ),
    strapiAuthGet<StrapiList<ServiceRequest>>(
      '/service-requests?sort=createdAt:desc&pagination[limit]=5',
      0
    ),
  ])

  const orders = (ordersRes as StrapiList<Order>).data ?? []
  const watchFiles = watchFilesRes.data?.data ?? []
  const serviceRequests = serviceRequestsRes.data?.data ?? []

  const lastOrder = orders[0] ?? null

  return (
    <div>
      <h1 className="text-2xl font-serif font-bold text-stone-900">
        Tableau de bord
      </h1>
      <p className="mt-1 text-sm text-stone-500">
        Bonjour {session.user.name} 👋
      </p>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Commandes"
          value={orders.length}
          href={`/${locale}/espace-client/commandes`}
        />
        <StatCard
          label="Dossiers montre"
          value={watchFiles.length}
          href={`/${locale}/espace-client/mes-montres`}
        />
        <StatCard
          label="Demandes de service"
          value={serviceRequests.length}
          href={`/${locale}/espace-client/demandes-de-service`}
        />
        <StatCard
          label="Demandes en cours"
          value={
            serviceRequests.filter((r) => r.status === 'in_progress').length
          }
          href={`/${locale}/espace-client/demandes-de-service`}
        />
      </div>

      {/* Last order */}
      {lastOrder && (
        <section className="mt-10">
          <h2 className="text-base font-semibold text-stone-800 mb-4">
            Dernière commande
          </h2>
          <div className="rounded-xl border border-stone-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-mono text-stone-500">
                  #{lastOrder.documentId.slice(-8).toUpperCase()}
                </p>
                <p className="mt-1 text-sm text-stone-700">
                  {new Date(lastOrder.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <p className="mt-1 text-xs text-stone-400">
                  {lastOrder.lineItems?.reduce((s, i) => s + i.quantity, 0) ??
                    0}{' '}
                  article(s)
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[lastOrder.status] ?? 'bg-stone-100 text-stone-600'}`}
                >
                  {STATUS_LABELS[lastOrder.status] ?? lastOrder.status}
                </span>
                <p className="text-sm font-semibold text-stone-900">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(lastOrder.total)}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-stone-100">
              <Link
                href={`/${locale}/espace-client/commandes/${lastOrder.documentId}`}
                className="text-sm text-amber-800 hover:underline"
              >
                Voir le détail →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Active watch files */}
      {watchFiles.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold text-stone-800 mb-4">
            Dossiers actifs
          </h2>
          <ul className="space-y-2">
            {watchFiles.map((wf) => (
              <li key={wf.documentId}>
                <Link
                  href={`/${locale}/espace-client/mes-montres/${wf.documentId}`}
                  className="flex items-center justify-between rounded-xl border border-stone-100 bg-white px-5 py-4 shadow-sm hover:border-amber-200 transition-colors"
                >
                  <span className="text-sm font-medium text-stone-800">
                    {wf.title}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[wf.status] ?? 'bg-stone-100 text-stone-600'}`}
                  >
                    {STATUS_LABELS[wf.status] ?? wf.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
