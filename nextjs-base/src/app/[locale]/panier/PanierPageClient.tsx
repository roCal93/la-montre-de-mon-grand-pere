'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

  const handleCheckout = async () => {
    const res = await fetch('/api/checkout/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, locale }),
    })
    const data = (await res.json()) as { url?: string; error?: string }
    if (data.url) {
      router.push(data.url)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
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
            {locale === 'fr' ? 'Decouvrir la boutique' : 'Browse the shop'}
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
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
              {locale === 'fr' ? 'Recapitulatif' : 'Summary'}
            </h2>
            <div className="flex justify-between text-sm text-neutral-600">
              <span>{locale === 'fr' ? 'Sous-total' : 'Subtotal'}</span>
              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-xs text-neutral-400">
              {locale === 'fr'
                ? "Frais de livraison calcules a l'etape suivante."
                : 'Shipping calculated at next step.'}
            </p>
            <button
              onClick={handleCheckout}
              className="w-full rounded-md bg-black py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 active:bg-neutral-900"
            >
              {locale === 'fr' ? 'Passer commande' : 'Proceed to checkout'}
            </button>
            <Link
              href={`/${locale}/boutique`}
              className="block text-center text-sm text-neutral-500 transition-colors hover:text-neutral-400"
            >
              {locale === 'fr' ? 'Continuer mes achats' : 'Continue shopping'}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
