'use client'

import { useCart } from '@/components/cart/CartContext'
import { formatPrice } from '@/lib/currency'
import Image from 'next/image'

interface Props {
  id: number
  name: string
  price: number
  imageUrl: string | null
  quantity: number
}

export function CartLineItem({ id, name, price, imageUrl, quantity }: Props) {
  const { removeItem } = useCart()

  return (
    <li className="flex gap-4 py-4">
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-neutral-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="h-full w-full bg-neutral-200" aria-hidden />
        )}
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex justify-between">
          <p className="text-sm font-medium">{name}</p>
          <p className="text-sm font-medium">{formatPrice(price * quantity)}</p>
        </div>
        <p className="mt-0.5 text-xs text-neutral-500">
          {formatPrice(price)} / unité
        </p>

        <div className="mt-2 flex items-center gap-2">
          <span className="rounded border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
            Pièce unique (x1)
          </span>
          <button
            aria-label="Supprimer l'article"
            onClick={() => removeItem(id)}
            className="ml-auto text-xs text-neutral-400 hover:text-red-500 transition-colors"
          >
            Retirer
          </button>
        </div>
      </div>
    </li>
  )
}
