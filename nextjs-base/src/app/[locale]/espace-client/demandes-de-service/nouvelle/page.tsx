'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  type: z.enum(['reparation', 'nettoyage', 'restauration', 'expertise']),
  watch_description: z.string().optional(),
  description: z
    .string()
    .min(10, 'Décrivez votre demande (minimum 10 caractères)'),
})

type FormData = z.infer<typeof schema>

const TYPE_OPTIONS = [
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
    value: 'restauration',
    label: 'Restauration',
    desc: 'Restauration esthétique complète',
  },
  {
    value: 'expertise',
    label: 'Expertise',
    desc: 'Estimation et authentification',
  },
]

export default function NouvelleDemandeServicePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'reparation' },
  })

  const selectedType = useWatch({ control, name: 'type' })

  const onSubmit = async (data: FormData) => {
    setError(null)

    const res = await fetch('/api/service-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const json = (await res.json()) as { error?: string }
      setError(json?.error ?? 'Erreur lors de la soumission.')
      return
    }

    router.push(`/${locale}/espace-client/demandes-de-service`)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link
          href={`/${locale}/espace-client/demandes-de-service`}
          className="text-sm text-stone-500 hover:text-stone-800"
        >
          ← Demandes de service
        </Link>
      </div>

      <h1 className="text-2xl font-serif font-bold text-stone-900">
        Nouvelle demande de service
      </h1>
      <p className="mt-1 text-sm text-stone-500 mb-8">
        Décrivez votre montre et votre besoin, nous reviendrons vers vous avec
        un devis.
      </p>

      <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-6"
        >
          {/* Type de service */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-3">
              Type de service
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={[
                    'flex flex-col gap-1 rounded-xl border-2 p-4 cursor-pointer transition-colors',
                    selectedType === opt.value
                      ? 'border-amber-700 bg-amber-50'
                      : 'border-stone-100 hover:border-stone-200',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    value={opt.value}
                    {...register('type')}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-stone-900">
                    {opt.label}
                  </span>
                  <span className="text-xs text-stone-500">{opt.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Description montre */}
          <div>
            <label
              className="block text-sm font-medium text-stone-700 mb-1.5"
              htmlFor="watch_description"
            >
              Montre concernée{' '}
              <span className="text-stone-400 font-normal">(facultatif)</span>
            </label>
            <input
              id="watch_description"
              type="text"
              placeholder="Ex : Montre de gousset Grand-père, Oméga Seamaster…"
              {...register('watch_description')}
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
            />
          </div>

          {/* Description du problème */}
          <div>
            <label
              className="block text-sm font-medium text-stone-700 mb-1.5"
              htmlFor="description"
            >
              Description de votre demande
            </label>
            <textarea
              id="description"
              rows={5}
              placeholder="Décrivez le problème, l'état de la montre, ce que vous souhaitez…"
              {...register('description')}
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700 resize-none"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

          {error && (
            <p
              className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-stone-900 px-6 py-3 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60 transition-colors"
            >
              {isSubmitting ? 'Envoi…' : 'Envoyer la demande'}
            </button>
            <Link
              href={`/${locale}/espace-client/demandes-de-service`}
              className="text-sm text-stone-500 hover:text-stone-800"
            >
              Annuler
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
