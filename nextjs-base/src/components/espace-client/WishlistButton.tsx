'use client'

import { useEffect, useState, useTransition } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'

interface WishlistButtonProps {
  productDocumentId: string
  className?: string
}

type WishlistItem = { documentId: string }

export function WishlistButton({
  productDocumentId,
  className = '',
}: WishlistButtonProps) {
  const { status } = useSession()
  const pathname = usePathname()
  const locale = pathname.split('/')[1] === 'en' ? 'en' : 'fr'

  const [isFavorite, setIsFavorite] = useState(false)
  const [wishlistItemId, setWishlistItemId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (status !== 'authenticated') return

    fetch('/api/wishlist')
      .then((r) => r.json())
      .then((json: { data: WishlistItem[] }) => {
        const items = json?.data ?? []
        // The server returns items with product.documentId populated
        const matched = items.find(
          (i: WishlistItem & { product?: { documentId?: string } }) =>
            (i as { product?: { documentId?: string } }).product?.documentId ===
            productDocumentId
        ) as (WishlistItem & { product?: { documentId?: string } }) | undefined
        if (matched) {
          setIsFavorite(true)
          setWishlistItemId(matched.documentId)
        }
      })
      .catch(() => {})
  }, [status, productDocumentId])

  const toggle = () => {
    if (status !== 'authenticated') {
      window.location.href = `/${locale}/espace-client/connexion?from=${encodeURIComponent(pathname)}`
      return
    }

    startTransition(async () => {
      if (isFavorite && wishlistItemId) {
        await fetch(`/api/wishlist/${wishlistItemId}`, { method: 'DELETE' })
        setIsFavorite(false)
        setWishlistItemId(null)
      } else {
        const res = await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product: productDocumentId }),
        })
        const json = (await res.json()) as { data?: WishlistItem }
        if (json?.data?.documentId) {
          setIsFavorite(true)
          setWishlistItemId(json.data.documentId)
        }
      }
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={[
        'flex items-center justify-center rounded-full border-2 h-11 w-11 text-lg transition-colors disabled:opacity-50',
        isFavorite
          ? 'border-red-400 text-red-500 bg-red-50'
          : 'border-stone-200 text-stone-400 bg-white hover:border-red-300 hover:text-red-400',
        className,
      ].join(' ')}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isFavorite ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={1.5}
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </button>
  )
}
