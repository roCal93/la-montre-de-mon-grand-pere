'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useParams } from 'next/navigation'
import { useCart } from '@/components/cart/CartContext'
import { CartLineItem } from '@/components/cart/CartLineItem'
import { formatPrice } from '@/lib/currency'

export function CartDrawer() {
  const { items, subtotal, isOpen, closeCart } = useCart()
  const overlayRef = useRef<HTMLDivElement>(null)
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const locale = (params?.locale as string) ?? 'fr'
  const [headerOffset, setHeaderOffset] = useState(0)
  const [cgvAccepted, setCgvAccepted] = useState(false)

  useEffect(() => {
    const updateHeaderOffset = () => {
      const header = document.getElementById('site-header')
      setHeaderOffset(header?.getBoundingClientRect().height ?? 0)
    }

    updateHeaderOffset()
    window.addEventListener('resize', updateHeaderOffset)

    return () => {
      window.removeEventListener('resize', updateHeaderOffset)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const header = document.getElementById('site-header')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeaderOffset(header?.getBoundingClientRect().height ?? 0)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, closeCart])

  const handleCheckout = async () => {
    const res = await fetch('/api/checkout/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, locale }),
    })
    const data = (await res.json()) as { url?: string; error?: string }
    if (data.url) {
      router.push(data.url)
    } else {
      if (res.status === 401) {
        closeCart()
        router.push(
          `/${locale}/espace-client/connexion?from=${encodeURIComponent(pathname)}`
        )
        return
      }
      console.error('Checkout session error:', data.error)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        aria-hidden
        onClick={closeCart}
        style={{ top: `${headerOffset}px` }}
        className={`fixed right-0 bottom-0 left-0 z-40 bg-black/40 transition-opacity duration-300 ${
          isOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal
        aria-label="Panier"
        style={{
          top: `${headerOffset}px`,
          height: `calc(100dvh - ${headerOffset}px)`,
        }}
        className={`fixed right-0 bottom-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 dark:bg-neutral-900 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 dark:border-neutral-700">
          <h2 className="text-lg font-semibold dark:text-white">
            Panier{' '}
            {items.length > 0 && (
              <span className="ml-1 text-sm font-normal text-neutral-500">
                ({items.length} {items.length === 1 ? 'article' : 'articles'})
              </span>
            )}
          </h2>
          <button
            onClick={closeCart}
            aria-label="Fermer le panier"
            className="rounded p-1 hover:bg-neutral-100 transition-colors dark:hover:bg-neutral-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-6">
          {items.length === 0 ? (
            <p className="mt-10 text-center text-sm text-neutral-500">
              Votre panier est vide.
            </p>
          ) : (
            <ul role="list" className="divide-y dark:divide-neutral-700">
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
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t px-6 py-4 space-y-4 dark:border-neutral-700">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600 dark:text-neutral-400">
                Sous-total (livraison offerte)
              </span>
              <span className="font-semibold">{formatPrice(subtotal)}</span>
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cgvAccepted}
                onChange={(e) => setCgvAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border border-neutral-300 accent-neutral-900 dark:accent-white"
              />
              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                {locale === 'en' ? (
                  <>
                    I have read and accept the{' '}
                    <Link
                      href={`/${locale}/cgv`}
                      onClick={closeCart}
                      className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-white"
                    >
                      Terms & Conditions
                    </Link>
                  </>
                ) : (
                  <>
                    J&apos;ai lu et j&apos;accepte les{' '}
                    <Link
                      href={`/${locale}/cgv`}
                      onClick={closeCart}
                      className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-white"
                    >
                      Conditions Générales de Vente
                    </Link>
                  </>
                )}
              </span>
            </label>
            <button
              onClick={handleCheckout}
              disabled={!cgvAccepted}
              className="w-full rounded-md bg-black py-3 text-sm font-medium text-white hover:bg-neutral-800 active:bg-neutral-900 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              Passer commande
            </button>
            <button
              onClick={closeCart}
              className="w-full text-center text-sm text-neutral-500 hover:text-black transition-colors dark:text-neutral-400 dark:hover:text-white"
            >
              Continuer mes achats
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
