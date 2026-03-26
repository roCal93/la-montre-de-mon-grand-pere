'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSession } from 'next-auth/react'

const profileSchema = z.object({
  username: z.string().min(2, 'Minimum 2 caractères'),
  email: z.string().email('Email invalide'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Requis'),
    password: z.string().min(8, 'Minimum 8 caractères'),
    passwordConfirmation: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirmation, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['passwordConfirmation'],
  })

type ProfileData = z.infer<typeof profileSchema>
type PasswordData = z.infer<typeof passwordSchema>

export default function ProfilPage({ params }: { params: Promise<{ locale: string }> }) {
  use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: session?.user?.name ?? '',
      email: session?.user?.email ?? '',
    },
  })

  const passwordForm = useForm<PasswordData>({ resolver: zodResolver(passwordSchema) })

  const onProfileSubmit = async (data: ProfileData) => {
    setProfileError(null)
    setProfileSuccess(false)

    const res = await fetch('/api/account/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const json = (await res.json()) as { error?: string }
      setProfileError(json?.error ?? 'Erreur lors de la mise à jour.')
      return
    }

    setProfileSuccess(true)
    router.refresh()
  }

  const onPasswordSubmit = async (data: PasswordData) => {
    setPasswordError(null)
    setPasswordSuccess(false)

    const res = await fetch('/api/account/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const json = (await res.json()) as { error?: string }
      setPasswordError(json?.error ?? 'Erreur lors du changement de mot de passe.')
      return
    }

    setPasswordSuccess(true)
    passwordForm.reset()
  }

  if (!session) return null

  return (
    <div>
      <h1 className="text-2xl font-serif font-bold text-stone-900">Mon profil</h1>

      {/* Profile info */}
      <section className="mt-8 rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-stone-800 mb-5">Informations personnelles</h2>
        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5" htmlFor="username">
              Nom / Prénom
            </label>
            <input
              id="username"
              type="text"
              {...profileForm.register('username')}
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
            />
            {profileForm.formState.errors.username && (
              <p className="mt-1 text-xs text-red-600">
                {profileForm.formState.errors.username.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              {...profileForm.register('email')}
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
            />
            {profileForm.formState.errors.email && (
              <p className="mt-1 text-xs text-red-600">
                {profileForm.formState.errors.email.message}
              </p>
            )}
          </div>

          {profileError && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{profileError}</p>
          )}
          {profileSuccess && (
            <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
              Profil mis à jour !
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={profileForm.formState.isSubmitting}
              className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60 transition-colors"
            >
              {profileForm.formState.isSubmitting ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </section>

      {/* Change password */}
      <section className="mt-6 rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-stone-800 mb-5">Changer le mot de passe</h2>
        <form
          onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
          noValidate
          className="space-y-4"
        >
          <div>
            <label
              className="block text-sm font-medium text-stone-700 mb-1.5"
              htmlFor="currentPassword"
            >
              Mot de passe actuel
            </label>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              {...passwordForm.register('currentPassword')}
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-stone-700 mb-1.5"
              htmlFor="newPassword"
            >
              Nouveau mot de passe
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              {...passwordForm.register('password')}
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
            />
            {passwordForm.formState.errors.password && (
              <p className="mt-1 text-xs text-red-600">
                {passwordForm.formState.errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label
              className="block text-sm font-medium text-stone-700 mb-1.5"
              htmlFor="confirmPassword"
            >
              Confirmer le nouveau mot de passe
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...passwordForm.register('passwordConfirmation')}
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700"
            />
            {passwordForm.formState.errors.passwordConfirmation && (
              <p className="mt-1 text-xs text-red-600">
                {passwordForm.formState.errors.passwordConfirmation.message}
              </p>
            )}
          </div>

          {passwordError && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{passwordError}</p>
          )}
          {passwordSuccess && (
            <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
              Mot de passe modifié avec succès !
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={passwordForm.formState.isSubmitting}
              className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60 transition-colors"
            >
              {passwordForm.formState.isSubmitting ? 'Changement…' : 'Changer le mot de passe'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
