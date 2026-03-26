'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Email invalide'),
})

type FormData = z.infer<typeof schema>

export default function MotDePasseOubliePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setError(null)
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL

    const res = await fetch(`${strapiUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email }),
    })

    if (!res.ok) {
      setError("Erreur lors de l'envoi. Vérifiez votre email.")
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-2xl bg-white p-10 shadow-sm border border-stone-100">
            <div className="text-4xl mb-4">✉️</div>
            <h2 className="text-xl font-serif font-bold text-stone-900 mb-2">
              Email envoyé !
            </h2>
            <p className="text-sm text-stone-500 mb-6">
              Si un compte existe pour cet email, vous recevrez un lien de
              réinitialisation.
            </p>
            <Link
              href={`/${locale}/espace-client/connexion`}
              className="text-sm text-amber-800 hover:underline"
            >
              ← Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-serif font-bold text-stone-900">
            Mot de passe oublié
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Entrez votre email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm border border-stone-100">
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-5"
          >
            <div>
              <label
                className="block text-sm font-medium text-stone-700 mb-1.5"
                htmlFor="email"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.email.message}
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-stone-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Envoi…' : 'Envoyer le lien'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-500">
            <Link
              href={`/${locale}/espace-client/connexion`}
              className="text-amber-800 hover:underline"
            >
              ← Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
