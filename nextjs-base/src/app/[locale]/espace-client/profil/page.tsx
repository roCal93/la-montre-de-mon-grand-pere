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

export default function ProfilPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
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

  const passwordForm = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
  })

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
      setPasswordError(
        json?.error ?? 'Erreur lors du changement de mot de passe.'
      )
      return
    }

    setPasswordSuccess(true)
    passwordForm.reset()
  }

  if (!session) return null

  return (
    <div>
      <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-neutral-500">
        Espace client
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[0.01em] text-neutral-900">
        Mon profil
      </h1>

      {/* Profile info */}
      <section className="mt-8 border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.14em] text-neutral-500 mb-5">
          Informations personnelles
        </h2>
        <form
          onSubmit={profileForm.handleSubmit(onProfileSubmit)}
          noValidate
          className="space-y-4"
        >
          <div>
            <label
              className="mb-1.5 block font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.12em] text-neutral-600"
              htmlFor="username"
            >
              Nom / Prénom
            </label>
            <input
              id="username"
              type="text"
              {...profileForm.register('username')}
              className="w-full border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition-colors focus:border-black"
            />
            {profileForm.formState.errors.username && (
              <p className="mt-1 text-xs text-red-600">
                {profileForm.formState.errors.username.message}
              </p>
            )}
          </div>

          <div>
            <label
              className="mb-1.5 block font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.12em] text-neutral-600"
              htmlFor="email"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              {...profileForm.register('email')}
              className="w-full border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition-colors focus:border-black"
            />
            {profileForm.formState.errors.email && (
              <p className="mt-1 text-xs text-red-600">
                {profileForm.formState.errors.email.message}
              </p>
            )}
          </div>

          {profileError && (
            <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {profileError}
            </p>
          )}
          {profileSuccess && (
            <p className="border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Profil mis à jour !
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={profileForm.formState.isSubmitting}
              className="border border-black bg-black px-5 py-2.5 font-[family-name:var(--font-geist-mono)] text-[11px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-neutral-900 disabled:opacity-60 transition-colors"
            >
              {profileForm.formState.isSubmitting
                ? 'Sauvegarde…'
                : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </section>

      {/* Change password */}
      <section className="mt-6 border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.14em] text-neutral-500 mb-5">
          Changer le mot de passe
        </h2>
        <form
          onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
          noValidate
          className="space-y-4"
        >
          <div>
            <label
              className="mb-1.5 block font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.12em] text-neutral-600"
              htmlFor="currentPassword"
            >
              Mot de passe actuel
            </label>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              {...passwordForm.register('currentPassword')}
              className="w-full border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition-colors focus:border-black"
            />
          </div>

          <div>
            <label
              className="mb-1.5 block font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.12em] text-neutral-600"
              htmlFor="newPassword"
            >
              Nouveau mot de passe
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              {...passwordForm.register('password')}
              className="w-full border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition-colors focus:border-black"
            />
            {passwordForm.formState.errors.password && (
              <p className="mt-1 text-xs text-red-600">
                {passwordForm.formState.errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label
              className="mb-1.5 block font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.12em] text-neutral-600"
              htmlFor="confirmPassword"
            >
              Confirmer le nouveau mot de passe
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...passwordForm.register('passwordConfirmation')}
              className="w-full border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition-colors focus:border-black"
            />
            {passwordForm.formState.errors.passwordConfirmation && (
              <p className="mt-1 text-xs text-red-600">
                {passwordForm.formState.errors.passwordConfirmation.message}
              </p>
            )}
          </div>

          {passwordError && (
            <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {passwordError}
            </p>
          )}
          {passwordSuccess && (
            <p className="border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Mot de passe modifié avec succès !
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={passwordForm.formState.isSubmitting}
              className="border border-black bg-black px-5 py-2.5 font-[family-name:var(--font-geist-mono)] text-[11px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-neutral-900 disabled:opacity-60 transition-colors"
            >
              {passwordForm.formState.isSubmitting
                ? 'Changement…'
                : 'Changer le mot de passe'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
