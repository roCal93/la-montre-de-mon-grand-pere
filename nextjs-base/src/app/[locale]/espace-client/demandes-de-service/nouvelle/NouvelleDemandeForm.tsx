'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  type: z.enum(['retour_garantie', 'reparation', 'nettoyage', 'autre']),
  watch_file_document_id: z.string().min(1, 'Veuillez sélectionner une montre'),
  description: z
    .string()
    .min(10, 'Décrivez votre demande (minimum 10 caractères)'),
})

type FormData = z.infer<typeof schema>

const TYPE_OPTIONS = [
  {
    value: 'retour_garantie',
    label: 'Retour sous garantie',
    desc: 'La montre présente un défaut couvert par la garantie',
  },
  {
    value: 'reparation',
    label: 'Réparation',
    desc: "Remise en marche d'une montre en panne",
  },
  {
    value: 'nettoyage',
    label: 'Nettoyage',
    desc: 'Nettoyage et révision du mécanisme',
  },
  {
    value: 'autre',
    label: 'Autre',
    desc: 'Toute autre demande concernant votre montre',
  },
] as const

interface WatchFile {
  documentId: string
  reference: string
  product?: { name: string }
}

interface Props {
  locale: string
  watchFiles: WatchFile[]
}

type ServiceRequestResult = {
  ok: boolean
  error: string | null
}

async function readServiceRequestError(response: Response) {
  const json = (await response.json().catch(() => null)) as {
    error?: string
  } | null

  return json?.error ?? 'Erreur lors de la soumission.'
}

export async function submitServiceRequest(
  data: FormData,
  fetchImpl: typeof fetch = fetch
): Promise<ServiceRequestResult> {
  try {
    const response = await fetchImpl('/api/service-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      return {
        ok: false,
        error: await readServiceRequestError(response),
      }
    }

    return { ok: true, error: null }
  } catch {
    return { ok: false, error: 'Erreur lors de la soumission.' }
  }
}

export function NouvelleDemandeForm({ locale, watchFiles }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'retour_garantie',
      watch_file_document_id: watchFiles[0]?.documentId ?? '',
    },
  })

  const selectedType = useWatch({ control, name: 'type' })

  const onSubmit = async (data: FormData) => {
    setError(null)
    const result = await submitServiceRequest(data)

    if (!result.ok) {
      setError(result.error)
      return
    }

    router.push(`/${locale}/espace-client/demandes-de-service`)
    router.refresh()
  }

  if (watchFiles.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Link
            href={`/${locale}/espace-client/demandes-de-service`}
            className="text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            ← Demandes de service
          </Link>
        </div>
        <h1 className="text-2xl font-serif font-bold text-neutral-900 mb-4 dark:text-white">
          Nouvelle demande de service
        </h1>
        <div className="rounded-2xl border border-neutral-100 bg-white p-8 shadow-sm text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-neutral-600 mb-2 dark:text-neutral-300">
            Vous n&apos;avez pas encore de montre dans votre espace client.
          </p>
          <p className="text-sm text-neutral-400 mb-6 dark:text-neutral-500">
            Les demandes de service sont réservées aux montres achetées sur
            notre boutique.
          </p>
          <Link
            href={`/${locale}/boutique`}
            className="inline-block border border-black bg-black px-6 py-3 text-sm font-medium text-white hover:bg-neutral-900 transition-colors dark:border-white dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            Découvrir la boutique
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link
          href={`/${locale}/espace-client/demandes-de-service`}
          className="text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          ← Demandes de service
        </Link>
      </div>

      <h1 className="text-2xl font-serif font-bold text-neutral-900 dark:text-white">
        Nouvelle demande de service
      </h1>
      <p className="mt-1 text-sm text-neutral-500 mb-8 dark:text-neutral-400">
        Sélectionnez la montre concernée et décrivez votre besoin.
      </p>

      <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-6"
        >
          {/* Montre */}
          <div>
            <label
              className="block text-sm font-medium text-neutral-700 mb-1.5 dark:text-neutral-300"
              htmlFor="watch_file_document_id"
            >
              Montre concernée
            </label>
            <select
              id="watch_file_document_id"
              {...register('watch_file_document_id')}
              className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm focus:border-black focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-white"
            >
              {watchFiles.map((wf) => (
                <option key={wf.documentId} value={wf.documentId}>
                  {wf.product?.name ?? `Dossier ${wf.reference}`} -{' '}
                  {wf.reference}
                </option>
              ))}
            </select>
            {errors.watch_file_document_id && (
              <p className="mt-1 text-xs text-red-600">
                {errors.watch_file_document_id.message}
              </p>
            )}
          </div>

          {/* Type de service */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-3 dark:text-neutral-300">
              Type de service
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={[
                    'flex flex-col gap-1 border-2 p-4 cursor-pointer transition-colors',
                    selectedType === opt.value
                      ? 'border-black bg-neutral-50 dark:border-white dark:bg-neutral-800'
                      : 'border-neutral-100 hover:border-neutral-200 dark:border-neutral-700 dark:hover:border-neutral-500',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    value={opt.value}
                    {...register('type')}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">
                    {opt.label}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {opt.desc}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              className="block text-sm font-medium text-neutral-700 mb-1.5 dark:text-neutral-300"
              htmlFor="description"
            >
              Description de votre demande
            </label>
            <textarea
              id="description"
              rows={5}
              placeholder="Décrivez le problème, l'état de la montre, ce que vous souhaitez..."
              {...register('description')}
              className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm focus:border-black focus:outline-none resize-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-white"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <p
              className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="border border-black bg-black px-6 py-3 text-sm font-medium text-white hover:bg-neutral-900 disabled:opacity-60 transition-colors dark:border-white dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              {isSubmitting ? 'Envoi...' : 'Envoyer la demande'}
            </button>
            <Link
              href={`/${locale}/espace-client/demandes-de-service`}
              className="text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              Annuler
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
