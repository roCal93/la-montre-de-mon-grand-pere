'use client'

import { useState } from 'react'
import Link from 'next/link'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours de traitement' },
  { value: 'quote_sent', label: 'Devis envoyé' },
  { value: 'accepted', label: 'Acceptée' },
  { value: 'completed', label: 'Terminée' },
  { value: 'cancelled', label: 'Annulée' },
] as const

type StatusValue = (typeof STATUS_OPTIONS)[number]['value']

interface ServiceRequestEditable {
  documentId: string
  type: string
  status: string
  admin_response?: string
  customerEmail?: string
}

interface Props {
  locale: string
  request: ServiceRequestEditable
}

export function ServiceRequestAdminForm({ locale, request }: Props) {
  const [status, setStatus] = useState<StatusValue>(
    (STATUS_OPTIONS.some((option) => option.value === request.status)
      ? request.status
      : 'pending') as StatusValue
  )
  const [adminResponse, setAdminResponse] = useState(
    request.admin_response ?? ''
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSaving(true)

    try {
      const res = await fetch(
        `/api/admin/service-requests/${request.documentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            admin_response: adminResponse,
          }),
        }
      )

      const json = (await res.json().catch(() => null)) as {
        error?: string
        emailNotification?: {
          sent?: boolean
          reason?: string
        }
      } | null

      if (!res.ok) {
        setError(json?.error ?? 'Erreur lors de la mise à jour.')
        return
      }

      const emailHint = request.customerEmail
        ? json?.emailNotification?.sent
          ? ' Le client a ete notifie par email.'
          : json?.emailNotification?.reason === 'email_not_configured'
            ? " Email client non envoye: configuration email manquante."
            : json?.emailNotification?.reason === 'send_failed'
              ? " Email client non envoye: echec d'envoi (voir logs serveur)."
              : ''
        : ''
      setSuccess(`Mise à jour enregistrée.${emailHint}`)
    } catch {
      setError('Erreur lors de la mise à jour.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
        Suivi atelier
      </h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Mettez à jour le statut et la réponse visible par le client.
      </p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-neutral-700 mb-1.5 dark:text-neutral-300"
          >
            Statut
          </label>
          <select
            id="status"
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusValue)}
            className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm focus:border-black focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-white"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="admin_response"
            className="block text-sm font-medium text-neutral-700 mb-1.5 dark:text-neutral-300"
          >
            Réponse atelier (optionnelle)
          </label>
          <textarea
            id="admin_response"
            rows={6}
            value={adminResponse}
            onChange={(event) => setAdminResponse(event.target.value)}
            placeholder="Indiquez les étapes, le devis, les délais, etc."
            className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm focus:border-black focus:outline-none resize-y dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-white"
          />
        </div>

        {error && (
          <p
            className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}

        {success && (
          <p
            className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700"
            role="status"
          >
            {success}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="border border-black bg-black px-6 py-3 text-sm font-medium text-white hover:bg-neutral-900 disabled:opacity-60 transition-colors dark:border-white dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <Link
            href={`/${locale}/espace-client/admin/demandes-de-service`}
            className="text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            Retour à la liste
          </Link>
        </div>
      </form>
    </section>
  )
}
