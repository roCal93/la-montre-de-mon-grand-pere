import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { strapiAuthGet } from '@/lib/strapi-auth-client'
import Link from 'next/link'

interface ServiceRequest {
  documentId: string
  type: string
  watch_description?: string
  status: string
  createdAt: string
  admin_response?: string
}

interface StrapiList<T> {
  data: T[]
}

const TYPE_LABELS: Record<string, string> = {
  retour_garantie: 'Retour sous garantie',
  reparation: 'Réparation',
  nettoyage: 'Nettoyage',
  autre: 'Autre',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  in_progress: 'En cours de traitement',
  quote_sent: 'Devis envoyé',
  accepted: 'Acceptée',
  completed: 'Terminée',
  cancelled: 'Annulée',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-stone-100 text-stone-600',
  in_progress: 'bg-blue-100 text-blue-800',
  quote_sent: 'bg-amber-100 text-amber-800',
  accepted: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default async function DemandesDeServicePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session) redirect(`/${locale}/espace-client/connexion`)

  const { data } = await strapiAuthGet<StrapiList<ServiceRequest>>(
    '/service-requests?sort=createdAt:desc',
    0
  )

  const requests = data?.data ?? []

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-2">
        <div>
          <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            Espace client
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[0.01em] text-neutral-900">
            Demandes de service
          </h1>
        </div>
        <Link
          href={`/${locale}/espace-client/demandes-de-service/nouvelle`}
          className="shrink-0 border border-black bg-black px-4 py-2.5 font-[family-name:var(--font-geist-mono)] text-[11px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-neutral-900 transition-colors"
        >
          + Nouvelle demande
        </Link>
      </div>
      <p className="text-sm text-neutral-500 mb-8">
        Réparation, nettoyage et suivi de vos montres.
      </p>

      {requests.length === 0 ? (
        <div className="mt-4 border border-dashed border-neutral-200 bg-white py-16 px-6 text-center">
          <p className="text-neutral-500 text-sm">
            Aucune demande de service pour le moment.
          </p>
          <Link
            href={`/${locale}/espace-client/demandes-de-service/nouvelle`}
            className="mt-4 inline-block font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.1em] text-neutral-800 transition-colors hover:text-black"
          >
            Créer votre première demande
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {requests.map((req) => (
            <li
              key={req.documentId}
              className="border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900">
                    {TYPE_LABELS[req.type] ?? req.type}
                  </p>
                  {req.watch_description && (
                    <p className="mt-0.5 text-xs text-neutral-400 truncate">
                      {req.watch_description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-neutral-400">
                    {new Date(req.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <span
                  className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[req.status] ?? 'bg-stone-100 text-stone-600'}`}
                >
                  {STATUS_LABELS[req.status] ?? req.status}
                </span>
              </div>

              {req.admin_response && (
                <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
                  <p className="text-xs font-medium text-amber-900 mb-1">
                    Réponse de l&apos;atelier :
                  </p>
                  <p className="text-sm text-amber-800">{req.admin_response}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
