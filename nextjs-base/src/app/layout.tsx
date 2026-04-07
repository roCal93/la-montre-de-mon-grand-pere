import type { Metadata } from 'next'
import { Afacad, Geist_Mono } from 'next/font/google'
import './globals.css'
import { cookies, headers } from 'next/headers'
import { defaultLocale } from '@/lib/locales'
import { isDisableDark } from '@/lib/theme'

// Mark layout dynamic since we read cookies/headers for locale detection
const afacadSans = Afacad({
  variable: '--font-afacad',
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  adjustFontFallback: true,
})

export const metadata: Metadata = {
  title: 'La Montre de Mon Grand-Pere',
  description:
    'Atelier horloger et montres de caractere: vente, entretien et restauration.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  ),
  openGraph: {
    title: 'La Montre de Mon Grand-Pere',
    description:
      'Decouvrez une selection de montres et un accompagnement horloger sur mesure.',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    siteName:
      process.env.NEXT_PUBLIC_SITE_NAME || 'La Montre de Mon Grand-Pere',
    locale: 'fr_FR',
    type: 'website',
    images: [
      {
        url: '/images/logo.png',
        width: 800,
        height: 600,
        alt: 'Site Logo',
      },
    ],
  },
}

import DevPerfProtector from '@/components/dev/DevPerfProtector'
import { SchemaOrg } from '@/components/seo/SchemaOrg'
import CookieConsentBanner from '@/components/shared/CookieConsentBanner'

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  let locale = defaultLocale
  let cookieConsent: 'accepted' | 'rejected' | undefined

  try {
    const cookieStore = await cookies()
    const cookieLocale = cookieStore.get('locale')?.value
    const consentValue = cookieStore.get('cookie_consent')?.value
    if (consentValue === 'accepted' || consentValue === 'rejected') {
      cookieConsent = consentValue
    }
    if (cookieLocale === 'fr' || cookieLocale === 'en') {
      locale = cookieLocale
    } else {
      locale = defaultLocale
    }
  } catch {
    // Fallback: parse header cookie string if cookies() is unavailable
    try {
      const cookieHeader = (await headers()).get('cookie') ?? ''
      const match = cookieHeader.match(/(?:^|; )locale=([^;]+)/)
      const parsedLocale = match ? decodeURIComponent(match[1]) : defaultLocale
      const consentMatch = cookieHeader.match(/(?:^|; )cookie_consent=([^;]+)/)
      const parsedConsent = consentMatch
        ? decodeURIComponent(consentMatch[1])
        : undefined
      if (parsedConsent === 'accepted' || parsedConsent === 'rejected') {
        cookieConsent = parsedConsent
      }
      locale =
        parsedLocale === 'fr' || parsedLocale === 'en'
          ? parsedLocale
          : defaultLocale
    } catch {
      locale = defaultLocale
    }
  }

  const disableDark = isDisableDark()

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      data-disable-dark={disableDark ? 'true' : undefined}
    >
      <head>
        {!disableDark && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem('theme-override');var p=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=t==='dark'||(t!=='light'&&p);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`,
            }}
          />
        )}
      </head>
      <body
        className={`${afacadSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Structured data for SEO */}
        <SchemaOrg />
        {/* Dev-only protective wrapper to avoid dev tooling throwing on performance.measure */}
        <DevPerfProtector />
        {children}
        {!cookieConsent && <CookieConsentBanner />}
      </body>
    </html>
  )
}
