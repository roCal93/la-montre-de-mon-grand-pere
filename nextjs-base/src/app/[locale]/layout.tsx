import React from 'react'
import { LangSetter } from '@/components/locale'
import { PageTransition } from '@/components/animations/PageTransition'
import { notFound } from 'next/navigation'
import { isSupportedLocale } from '@/lib/supported-locales'
import { CartProvider } from '@/components/cart/CartContext'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { AuthProvider } from '@/components/espace-client/AuthProvider'

export const dynamic = 'force-dynamic'

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{
    locale: string
  }>
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params

  if (!(await isSupportedLocale(locale))) {
    notFound()
  }

  return (
    <AuthProvider>
      <CartProvider>
        <CartDrawer />
        <PageTransition>
          <LangSetter lang={locale} />
          {children}
        </PageTransition>
      </CartProvider>
    </AuthProvider>
  )
}
