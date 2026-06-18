'use client'

import { useEffect, useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'

interface WishlistButtonProps {
  productDocumentId: string
  productId?: number
  className?: string
}

type WishlistItem = {
  documentId: string
  product?:
    | { documentId?: string }
    | {
        data?:
          | { documentId?: string }
          | { attributes?: { documentId?: string } }
      }
}

function getWishlistProductDocumentId(item: WishlistItem): string | null {
  const product = item.product
  if (!product || typeof product !== 'object') return null

  if ('documentId' in product && typeof product.documentId === 'string') {
    return product.documentId
  }

  const wrapped = (product as { data?: unknown }).data
  if (!wrapped || typeof wrapped !== 'object') return null

  if (
    'documentId' in wrapped &&
    typeof (wrapped as { documentId?: unknown }).documentId === 'string'
  ) {
    return (wrapped as { documentId: string }).documentId
  }

  const attributes = (wrapped as { attributes?: { documentId?: string } })
    .attributes
  return typeof attributes?.documentId === 'string'
    ? attributes.documentId
    : null
}

export function WishlistButton({
  productDocumentId,
  productId,
  className = '',
}: WishlistButtonProps) {
  const pathname = usePathname()
  const locale = pathname.split('/')[1] === 'en' ? 'en' : 'fr'

  const [isFavorite, setIsFavorite] = useState(false)
  const [wishlistItemId, setWishlistItemId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const normalizedProductDocumentId = productDocumentId?.trim() ?? ''

  const redirectToLogin = () => {
    window.location.href = `/${locale}/espace-client/connexion?from=${encodeURIComponent(pathname)}`
  }

  useEffect(() => {
    if (!normalizedProductDocumentId) {
      setIsFavorite(false)
      setWishlistItemId(null)
      return
    }

    fetch('/api/wishlist', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) return { data: [] as WishlistItem[] }
        return (await r.json()) as { data: WishlistItem[] }
      })
      .then((json: { data: WishlistItem[] }) => {
        const items = json?.data ?? []
        const matched = items.find(
          (item) =>
            getWishlistProductDocumentId(item) === normalizedProductDocumentId
        )
        if (matched) {
          setIsFavorite(true)
          setWishlistItemId(matched.documentId)
        } else {
          setIsFavorite(false)
          setWishlistItemId(null)
        }
      })
      .catch(() => {})
  }, [normalizedProductDocumentId])

  const toggle = () => {
    if (!normalizedProductDocumentId) {
      console.warn('[wishlist] product documentId manquant')
      return
    }

    startTransition(async () => {
      if (isFavorite && wishlistItemId) {
        const res = await fetch(`/api/wishlist/${wishlistItemId}`, {
          method: 'DELETE',
        })
        if (res.status === 401) {
          redirectToLogin()
          return
        }
        if (!res.ok) return
        setIsFavorite(false)
        setWishlistItemId(null)
      } else {
        const res = await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product: normalizedProductDocumentId,
            productId,
          }),
        })
        if (res.status === 401) {
          redirectToLogin()
          return
        }
        if (!res.ok) {
          const errorPayload = await res
            .json()
            .catch(() => ({ error: 'Erreur inconnue' }))
          console.warn('[wishlist] add failed', errorPayload)
          return
        }
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
      disabled={isPending || !normalizedProductDocumentId}
      aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={[
        'flex items-center justify-center transition-opacity disabled:opacity-50',
        isFavorite
          ? 'text-stone-900 dark:text-white'
          : 'text-stone-300 hover:text-stone-700 dark:text-neutral-500 dark:hover:text-neutral-200',
        className,
      ].join(' ')}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isFavorite ? '#9ca3af' : 'none'}
        stroke={isFavorite ? '#111827' : 'currentColor'}
        strokeWidth={1.5}
        className="h-8 w-8"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
        />
      </svg>
    </button>
  )
}
