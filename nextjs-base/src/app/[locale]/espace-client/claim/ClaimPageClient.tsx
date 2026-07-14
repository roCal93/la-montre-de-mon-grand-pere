'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type ClaimState =
  | { status: 'invalid_token' }
  | { status: 'auth_required'; from: string }
  | { status: 'admin_blocked' }
  | { status: 'claiming' }
  | { status: 'success'; watchFileDocumentId: string }
  | { status: 'error'; message: string }

export function ClaimPageClient({
  locale,
  token,
  isAuthenticated,
  isAdmin,
}: {
  locale: string
  token: string
  isAuthenticated: boolean
  isAdmin: boolean
}) {
  const fromPath = useMemo(() => {
    const query = new URLSearchParams({ token })
    return `/${locale}/espace-client/claim?${query.toString()}`
  }, [locale, token])

  const [state, setState] = useState<ClaimState>(() => {
    if (!token) return { status: 'invalid_token' }
    if (!isAuthenticated) return { status: 'auth_required', from: fromPath }
    if (isAdmin) return { status: 'admin_blocked' }
    return { status: 'claiming' }
  })

  useEffect(() => {
    if (!isAuthenticated || !token || isAdmin) return

    let cancelled = false

    const claim = async () => {
      const response = await fetch('/api/watch-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }).catch(() => null)

      if (!response) {
        if (!cancelled) {
          setState({
            status: 'error',
            message:
              'Impossible de contacter le serveur pour associer cette montre.',
          })
        }
        return
      }

      const json = (await response.json().catch(() => null)) as {
        success?: boolean
        watchFileDocumentId?: string
        error?: string
      } | null

      if (!response.ok || !json?.success || !json.watchFileDocumentId) {
        if (!cancelled) {
          setState({
            status: 'error',
            message:
              json?.error ??
              'Cette montre ne peut pas être associée automatiquement.',
          })
        }
        return
      }

      if (!cancelled) {
        setState({
          status: 'success',
          watchFileDocumentId: json.watchFileDocumentId,
        })
      }
    }

    claim()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, token, isAdmin])

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.16em] text-neutral-500">
        Activation montre
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[0.01em] text-neutral-900 dark:text-white">
        Associer votre montre a votre compte
      </h1>

      {state.status === 'invalid_token' ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
          QR code invalide. Contactez l&apos;atelier pour obtenir un nouveau
          lien.
        </p>
      ) : null}

      {state.status === 'auth_required' ? (
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Connectez-vous ou creez votre compte pour associer cette montre.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/${locale}/espace-client/connexion?from=${encodeURIComponent(state.from)}`}
              className="inline-flex items-center border border-black bg-black px-4 py-2.5 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.1em] text-white"
            >
              Se connecter
            </Link>
            <Link
              href={`/${locale}/espace-client/inscription?from=${encodeURIComponent(state.from)}`}
              className="inline-flex items-center border border-neutral-400 px-4 py-2.5 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.1em] text-neutral-700 dark:border-neutral-500 dark:text-neutral-200"
            >
              Creer un compte
            </Link>
          </div>
        </div>
      ) : null}

      {state.status === 'admin_blocked' ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
          <p>
            Vous etes connecte avec un compte admin. Pour eviter une mauvaise
            attribution, le claim est bloque pour les admins.
          </p>
          <p className="mt-2">
            Deconnectez-vous puis reconnectez-vous avec le compte client final
            (ou ouvrez le lien en navigation privee).
          </p>
        </div>
      ) : null}

      {state.status === 'claiming' ? (
        <p className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
          Association en cours...
        </p>
      ) : null}

      {state.status === 'success' ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
          <p>Votre montre a bien ete associee a votre compte.</p>
          <Link
            href={`/${locale}/espace-client/mes-montres/${state.watchFileDocumentId}`}
            className="mt-3 inline-flex items-center font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.1em] text-emerald-900 underline"
          >
            Voir mon dossier montre
          </Link>
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800">
          <p>{state.message}</p>
          <Link
            href={`/${locale}/espace-client/mes-montres`}
            className="mt-3 inline-flex items-center font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.1em] text-red-800 underline"
          >
            Aller a mes montres
          </Link>
        </div>
      ) : null}
    </div>
  )
}
