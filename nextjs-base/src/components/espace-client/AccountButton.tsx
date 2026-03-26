'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'

export function AccountButton() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const locale = pathname.split('/')[1] === 'en' ? 'en' : 'fr'

  const href = session
    ? `/${locale}/espace-client/tableau-de-bord`
    : `/${locale}/espace-client/connexion`

  return (
    <Link
      href={href}
      aria-label={session ? 'Mon espace client' : 'Se connecter'}
      title={session ? `Espace client — ${session.user.email}` : 'Se connecter'}
      className="flex h-9 w-9 items-center justify-center rounded-full text-stone-700 hover:bg-stone-100 transition-colors"
    >
      {/* User icon SVG */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
      {session && <span className="sr-only">Mon espace client</span>}
    </Link>
  )
}
