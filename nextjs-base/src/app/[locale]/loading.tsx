'use client'

import { usePathname } from 'next/navigation'

export default function Loading() {
  const pathname = usePathname()
  const locale = pathname?.split('/').filter(Boolean)[0] === 'en' ? 'en' : 'fr'

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
        <p className="text-sm text-gray-600">
          {locale === 'en' ? 'Loading...' : 'Chargement...'}
        </p>
      </div>
    </div>
  )
}
