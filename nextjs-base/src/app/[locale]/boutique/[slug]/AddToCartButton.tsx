'use client'

import { useCart } from '@/components/cart/CartContext'
import { formatPrice } from '@/lib/currency'

interface Props {
  product: {
    id: number
    documentId: string
    name: string
    slug: string
    price: number
    imageUrl: string | null
    stock: number
    description?: string | null
  }
}

export function AddToCartButton({ product }: Props) {
  const { addItem, openCart } = useCart()

  const handleAdd = () => {
    addItem({
      id: product.id,
      documentId: product.documentId,
      name: product.name,
      slug: product.slug,
      price: product.price,
      imageUrl: product.imageUrl,
      description: product.description,
    })
    openCart()
  }

  if (product.stock === 0) {
    return (
      <p className="text-sm text-neutral-500 font-medium">
        {/* sold out */}
        Vendu
      </p>
    )
  }

  return (
    <button
      onClick={handleAdd}
      className="w-full rounded-md border border-black bg-black px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-lg active:translate-y-0 active:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 dark:active:bg-neutral-300 dark:focus-visible:ring-white dark:focus-visible:ring-offset-neutral-950"
    >
      Ajouter au panier — {formatPrice(product.price)}
    </button>
  )
}
