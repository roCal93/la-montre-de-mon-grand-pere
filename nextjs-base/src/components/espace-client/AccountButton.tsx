'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'

const menuItems = [
  { href: '/espace-client/commandes', label: 'Mes commandes' },
  { href: '/espace-client/mes-montres', label: 'Mes montres' },
  { href: '/espace-client/demandes-de-service', label: 'Demandes de service' },
  { href: '/espace-client/favoris', label: 'Favoris' },
  { href: '/espace-client/profil', label: 'Mon profil' },
]

export function AccountButton() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const locale = pathname.split('/')[1] === 'en' ? 'en' : 'fr'

  const href = session
    ? `/${locale}/espace-client/tableau-de-bord`
    : `/${locale}/espace-client/connexion`

  const firstName = session?.user?.name?.split(' ')[0] ?? null

  if (!session) {
    return (
      <Link
        href={href}
        aria-label="Se connecter"
        className="flex items-center gap-1.5 text-stone-700 hover:text-stone-900 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 shrink-0"
          aria-hidden
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      </Link>
    )
  }

  return (
    <div className="relative group">
      {/* Trigger */}
      <Link
        href={href}
        aria-label="Mon espace client"
        className="flex items-center gap-1.5 text-stone-700 hover:text-stone-900 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 shrink-0"
          aria-hidden
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
        {firstName && (
          <span className="text-sm font-medium hidden sm:inline">
            Bonjour, {firstName}
          </span>
        )}
      </Link>

      {/* Dropdown — visible on hover */}
      <div className="absolute right-0 top-full pt-3 hidden group-hover:block z-50">
        <div className="w-52 rounded-xl border border-stone-200 bg-white shadow-lg overflow-hidden">
          <ul className="py-1">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={`/${locale}${item.href}`}
                  className="block px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-stone-100 py-1">
            <button
              onClick={() => signOut({ callbackUrl: `/${locale}` })}
              className="w-full text-left px-4 py-2.5 text-sm text-stone-400 hover:bg-stone-50 hover:text-stone-900 transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
