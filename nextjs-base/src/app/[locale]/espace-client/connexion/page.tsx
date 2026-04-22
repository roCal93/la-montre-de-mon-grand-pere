'use client'

import { use, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
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

  const dashboardPath = `/${locale}/espace-client/tableau-de-bord`
  const fromParam = searchParams.get('from')
  const isSafeFromPath =
    !!fromParam &&
    fromParam.startsWith(`/${locale}/espace-client/`) &&
    !fromParam.endsWith('/connexion') &&
    !fromParam.endsWith('/inscription') &&
    !fromParam.endsWith('/mot-de-passe-oublie')
  const redirectPath = isSafeFromPath ? fromParam : dashboardPath

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setError(null)

    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    if (result?.error) {
      setError('Email ou mot de passe incorrect.')
    } else {
      // router.refresh() forces Next.js to re-fetch all server components so the
      // layout's auth() call sees the freshly written session before navigation.
      router.refresh()
      router.push(redirectPath)
    }
  }

  return (
    <div className="flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            Espace client
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[0.01em] text-neutral-900 dark:text-white">
            Heureux de vous revoir
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Entrez vos identifiants pour acceder a votre compte.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-5"
          >
            <div>
              <label
                className="mb-1.5 block font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.12em] text-neutral-600 dark:text-neutral-400"
                htmlFor="email"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className="w-full border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition-colors focus:border-black dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-white"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                className="mb-1.5 block font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.12em] text-neutral-600 dark:text-neutral-400"
                htmlFor="password"
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className="w-full border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition-colors focus:border-black dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-white"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <p
                className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full border border-black bg-black px-4 py-3 font-[family-name:var(--font-geist-mono)] text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              {isSubmitting ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center text-sm text-neutral-500 dark:text-neutral-400">
            <p>
              <Link
                href={`/${locale}/espace-client/mot-de-passe-oublie`}
                className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.1em] text-neutral-800 transition-colors hover:text-black dark:text-neutral-200 dark:hover:text-white"
              >
                Mot de passe oublie ?
              </Link>
            </p>
            <p>
              Pas encore de compte ?{' '}
              <Link
                href={`/${locale}/espace-client/inscription`}
                className="font-semibold text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-black dark:text-white dark:decoration-neutral-600 dark:hover:text-neutral-300"
              >
                Creer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
