'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState } from 'react'

const navItems = [
  { href: '/espace-client/tableau-de-bord', label: 'Tableau de bord' },
  { href: '/espace-client/commandes', label: 'Mes commandes' },
  { href: '/espace-client/mes-montres', label: 'Mes montres' },
  { href: '/espace-client/demandes-de-service', label: 'Demandes de service' },
  { href: '/espace-client/favoris', label: 'Favoris' },
  { href: '/espace-client/profil', label: 'Mon profil' },
]

export function EspaceClientSidebar({ locale }: { locale: string }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const localePrefix = `/${locale}`

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 shadow-md md:hidden"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Menu espace client"
      >
        <span className="text-xs font-semibold">{mobileOpen ? 'X' : 'M'}</span>
      </button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-35 bg-black/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed inset-y-0 right-0 z-40 w-64 transform border-l border-neutral-200 bg-white transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 md:shrink-0',
          mobileOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <div className="flex h-full flex-col pt-16 md:pt-0">
          <div className="px-6 pb-4 pt-6 border-b border-neutral-200">
            <p className="font-[family-name:var(--font-geist-mono)] text-[20px] uppercase tracking-[0.18em] text-neutral-400">
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
                        'group relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-6 text-lg font-medium transition-colors',
                        isActive
                          ? 'text-neutral-900 font-semibold'
                          : 'text-neutral-500 hover:text-neutral-900',
                      ].join(' ')}
                    >
                      <span className="relative z-10">{item.label}</span>
                      <span
                        aria-hidden
                        className={[
                          'absolute inset-0 z-0 origin-left transform rounded-lg bg-neutral-200/60 transition-transform duration-200 ease-out',
                          isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                        ].join(' ')}
                      />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="border-t border-neutral-200 p-4">
            <button
              onClick={() => signOut({ callbackUrl: `/${locale}` })}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-lg font-medium text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
            >
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
