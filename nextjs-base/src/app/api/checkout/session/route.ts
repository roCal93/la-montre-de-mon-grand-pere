import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { toCents } from '@/lib/currency'
import type { CartItem } from '@/types/cart'

/** Strip HTML tags to get plain text (Stripe doesn't accept HTML in description) */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Return only publicly accessible image URLs (Stripe can't reach localhost) */
function toPublicImageUrl(url: string | null | undefined): string[] {
  if (!url) return []
  if (url.startsWith('http://localhost') || url.startsWith('http://127.'))
    return []
  return [url]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items, locale = 'fr' } = body as {
      items: CartItem[]
      locale?: string
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Watches are unique pieces: keep at most one line per product and force quantity to 1.
    const uniqueItems = Array.from(
      new Map(items.map((item) => [item.id, item])).values()
    ).map((item) => ({ ...item, quantity: 1 }))

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    if (!siteUrl) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_SITE_URL is not configured' },
        { status: 500 }
      )
    }

    const lineItems = uniqueItems.map((item) => ({
      price_data: {
        currency: 'eur',
        unit_amount: toCents(item.price),
        product_data: {
          name: item.name,
          ...(item.description
            ? { description: stripHtml(item.description).slice(0, 500) }
            : {}),
          images: toPublicImageUrl(item.imageUrl),
          metadata: {
            strapiId: String(item.id),
            slug: item.slug,
          },
        },
      },
      quantity: 1,
    }))

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      locale: locale === 'fr' ? 'fr' : 'en',
      shipping_address_collection: {
        allowed_countries: ['FR', 'BE', 'CH', 'LU', 'MC'],
      },
      payment_method_types: ['card'],
      success_url: `${siteUrl}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/${locale}/panier?cancelled=1`,
      metadata: {
        locale,
        cartItems: JSON.stringify(
          uniqueItems.map((i) => ({
            id: i.id,
            documentId: i.documentId,
            name: i.name,
            slug: i.slug,
            price: i.price,
            quantity: 1,
          }))
        ),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[checkout/session]', err)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
