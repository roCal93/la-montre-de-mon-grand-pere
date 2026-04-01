'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCart } from '@/components/cart/CartContext'

interface Props {
  className?: string
}

export function CartButton({ className = '' }: Props) {
  const { totalItems } = useCart()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fr'
  const cartHref = locale === 'en' ? '/en/cart' : `/${locale}/panier`

  return (
    <Link
      href={cartHref}
      aria-label={`Panier — ${totalItems} article${totalItems !== 1 ? 's' : ''}`}
      className={`flex h-9 w-9 items-center justify-center rounded-full text-stone-700 hover:bg-stone-100 transition-colors ${className}`}
    >
      {/* Cart icon */}
      <span className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>

        {totalItems > 0 && (
          <span className="absolute -right-3 -top-3 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
            {totalItems > 99 ? '99+' : totalItems}
          </span>
        )}
      </span>
    </Link>
  )
}
