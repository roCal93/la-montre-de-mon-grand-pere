'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState } from 'react'

const navItems = [
  {
    href: '/espace-client/tableau-de-bord',
    label: 'Tableau de bord',
    icon: '◈',
  },
  { href: '/espace-client/commandes', label: 'Mes commandes', icon: '📦' },
  { href: '/espace-client/mes-montres', label: 'Mes montres', icon: '⌚' },
  {
    href: '/espace-client/demandes-de-service',
    label: 'Demandes de service',
    icon: '🔧',
  },
  { href: '/espace-client/favoris', label: 'Favoris', icon: '♥' },
  { href: '/espace-client/profil', label: 'Mon profil', icon: '👤' },
]

export function EspaceClientSidebar({ locale }: { locale: string }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const localePrefix = `/${locale}`

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-20 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-stone-800 text-white shadow-lg md:hidden"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Menu espace client"
      >
        {mobileOpen ? '✕' : '☰'}
      </button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 w-64 transform bg-stone-900 text-white transition-transform duration-300 md:relative md:translate-x-0 md:block md:h-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex h-full flex-col pt-20 md:pt-0 md:sticky md:top-24">
          <div className="px-6 pb-4 pt-6 border-b border-stone-700">
            <p className="text-xs uppercase tracking-widest text-stone-400">
              Espace client
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {navItems.map((item) => {
                const fullHref = `${localePrefix}${item.href}`
                const isActive =
                  pathname === fullHref || pathname.startsWith(`${fullHref}/`)
                return (
                  <li key={item.href}>
                    <Link
                      href={fullHref}
                      onClick={() => setMobileOpen(false)}
                      className={[
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-amber-800/40 text-amber-200'
                          : 'text-stone-300 hover:bg-stone-800 hover:text-white',
                      ].join(' ')}
                    >
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="border-t border-stone-700 p-4">
            <button
              onClick={() => signOut({ callbackUrl: `/${locale}` })}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-400 transition-colors hover:bg-stone-800 hover:text-white"
            >
              <span>↩</span>
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
