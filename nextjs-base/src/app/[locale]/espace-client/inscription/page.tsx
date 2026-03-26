'use client'

import { use, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z
  .object({
    username: z.string().min(2, 'Minimum 2 caractères'),
    email: z.string().email('Email invalide'),
    password: z.string().min(8, 'Minimum 8 caractères'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirm'],
  })

type FormData = z.infer<typeof schema>

export default function InscriptionPage({
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
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setError(null)

    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL
    const res = await fetch(`${strapiUrl}/api/auth/local/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: data.username,
        email: data.email,
        password: data.password,
      }),
    })

    const json = (await res.json()) as { error?: { message?: string } }

    if (!res.ok) {
      setError(json?.error?.message ?? 'Erreur lors de la création du compte.')
      return
    }

    // Auto sign-in after registration
    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    if (result?.error) {
      setError('Compte créé ! Connectez-vous.')
      router.push(`/${locale}/espace-client/connexion`)
    } else {
      router.push(`/${locale}/espace-client/tableau-de-bord`)
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-serif font-bold text-stone-900">
            Créer un compte
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Rejoignez l&apos;espace client
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
                htmlFor="username"
              >
                Nom / Prénom
              </label>
              <input
                id="username"
                type="text"
                autoComplete="name"
                {...register('username')}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
              />
              {errors.username && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.username.message}
                </p>
              )}
            </div>

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

            <div>
              <label
                className="block text-sm font-medium text-stone-700 mb-1.5"
                htmlFor="password"
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label
                className="block text-sm font-medium text-stone-700 mb-1.5"
                htmlFor="confirm"
              >
                Confirmer le mot de passe
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                {...register('confirm')}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
              />
              {errors.confirm && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.confirm.message}
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
              {isSubmitting ? 'Création…' : 'Créer mon compte'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-500">
            Déjà un compte ?{' '}
            <Link
              href={`/${locale}/espace-client/connexion`}
              className="text-amber-800 hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
