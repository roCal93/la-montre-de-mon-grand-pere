'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NotFound() {
  const pathname = usePathname()
  const segments = pathname?.split('/').filter(Boolean) || []
  const locale =
    segments[0] === 'en' || segments[0] === 'fr' ? segments[0] : 'fr'

  const content = {
    fr: {
      title: '404',
      message: "Cette page n'existe pas.",
      button: "Retour à l'accueil",
    },
    en: {
      title: '404',
      message: "This page doesn't exist.",
      button: 'Back to home',
    },
  }

  const text = content[locale as 'fr' | 'en']

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '2rem',
      }}
      aria-labelledby="notfound-title"
    >
      <h1
        id="notfound-title"
        style={{ fontSize: '3rem', marginBottom: '1rem' }}
      >
        {text.title}
      </h1>

      <p style={{ marginBottom: '1.5rem', color: '#374151' }}>{text.message}</p>

      <Link
        href={`/${locale}`}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#2563eb',
          color: 'white',
          borderRadius: '0.5rem',
          textDecoration: 'none',
          fontWeight: '500',
        }}
      >
        {text.button}
      </Link>
    </main>
  )
}
