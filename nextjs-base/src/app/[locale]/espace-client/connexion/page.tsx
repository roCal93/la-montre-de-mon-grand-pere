'use client'

import { use, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court'),
})

type FormData = z.infer<typeof schema>

export default function ConnexionPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setError(null)
    const from =
      searchParams.get('from') ?? `/${locale}/espace-client/tableau-de-bord`

    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    if (result?.error) {
      setError('Email ou mot de passe incorrect.')
    } else {
      router.push(from)
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-serif font-bold text-stone-900">
            Espace client
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Connectez-vous à votre compte
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
                autoComplete="current-password"
                {...register('password')}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.password.message}
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
              {isSubmitting ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center text-sm text-stone-500">
            <p>
              <Link
                href={`/${locale}/espace-client/mot-de-passe-oublie`}
                className="text-amber-800 hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </p>
            <p>
              Pas encore de compte ?{' '}
              <Link
                href={`/${locale}/espace-client/inscription`}
                className="text-amber-800 hover:underline"
              >
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
