'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function WishlistRemoveButton({ itemId }: { itemId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleRemove = async () => {
    setLoading(true)
    await fetch(`/api/wishlist/${itemId}`, { method: 'DELETE' })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      aria-label="Retirer des favoris"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:border-red-200 hover:text-red-500 disabled:opacity-40 transition-colors"
    >
      {loading ? '…' : '♥'}
    </button>
  )
}
