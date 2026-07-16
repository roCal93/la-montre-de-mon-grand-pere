'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useCart } from '@/components/cart/CartContext'
import { CartLineItem } from '@/components/cart/CartLineItem'
import { formatPrice } from '@/lib/currency'

interface PanierPageClientProps {
  locale: string
  pageTitle?: string
  hideTitle?: boolean
}

export default function PanierPageClient({
  locale,
  pageTitle,
  hideTitle,
}: PanierPageClientProps) {
  const { items, subtotal } = useCart()
  const router = useRouter()
  const pathname = usePathname()
  const [cgvAccepted, setCgvAccepted] = useState(false)

  const handleCheckout = async () => {
    const res = await fetch('/api/checkout/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, locale }),
    })
    const data = (await res.json()) as { url?: string; error?: string }
    if (data.url) {
      router.push(data.url)
      return
    }

    if (res.status === 401) {
      router.push(
        `/${locale}/espace-client/connexion?from=${encodeURIComponent(pathname)}`
      )
    }
  }

  return (
    <div className="mx-auto mb-12 max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {!hideTitle ? (
        <h1 className="mb-8 text-3xl font-bold tracking-tight">
          {pageTitle || (locale === 'fr' ? 'Mon panier' : 'My cart')}
        </h1>
      ) : null}

      {items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="mb-6 text-neutral-500">
            {locale === 'fr' ? 'Votre panier est vide.' : 'Your cart is empty.'}
          </p>
          <Link
            href={`/${locale}/boutique`}
            className="inline-block rounded-md bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            {locale === 'fr' ? 'Découvrir la boutique' : 'Browse the shop'}
          </Link>
        </div>
      ) : (
        <div className="grid gap-24 lg:grid-cols-3">
          <ul role="list" className="divide-y lg:col-span-2">
            {items.map((item) => (
              <CartLineItem
                key={item.id}
                id={item.id}
                name={item.name}
                price={item.price}
                imageUrl={item.imageUrl}
                quantity={item.quantity}
              />
            ))}
          </ul>

          <div className="self-start space-y-4 rounded-xl border p-6">
            <h2 className="font-semibold">
              {locale === 'fr' ? 'Récapitulatif' : 'Summary'}
            </h2>
            <div className="flex justify-between text-sm text-neutral-600">
              <span>{locale === 'fr' ? 'Sous-total' : 'Subtotal'}</span>
              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-xs text-neutral-400">
              {locale === 'fr'
                ? 'Livraison offerte (France et Europe)'
                : 'Free shipping (France and Europe)'}
            </p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cgvAccepted}
                onChange={(e) => setCgvAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border border-neutral-300 accent-neutral-900 dark:accent-white"
              />
              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                {locale === 'fr' ? (
                  <>
                    J&apos;ai lu et j&apos;accepte les{' '}
                    <Link
                      href={`/${locale}/cgv`}
                      target="_blank"
                      className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-white"
                    >
                      Conditions Générales de Vente
                    </Link>
                  </>
                ) : (
                  <>
                    I have read and accept the{' '}
                    <Link
                      href={`/${locale}/cgv`}
                      target="_blank"
                      className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-white"
                    >
                      Terms & Conditions
                    </Link>
                  </>
                )}
              </span>
            </label>
            <button
              onClick={handleCheckout}
              disabled={!cgvAccepted}
              className="w-full rounded-md bg-neutral-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 active:bg-neutral-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 dark:active:bg-neutral-300 dark:disabled:opacity-40"
            >
              {locale === 'fr' ? 'Passer commande' : 'Proceed to checkout'}
            </button>
            <Link
              href={`/${locale}/boutique`}
              className="block text-center text-sm text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              {locale === 'fr' ? 'Continuer mes achats' : 'Continue shopping'}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
