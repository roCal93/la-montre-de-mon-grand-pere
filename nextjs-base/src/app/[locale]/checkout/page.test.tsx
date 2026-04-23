import { describe, expect, it } from 'vitest'

import { getCheckoutCancelContent } from './cancel/page'
import { getCheckoutSuccessContent } from './success/page'

describe('checkout locale content', () => {
  it('builds french success content and shop link', () => {
    expect(getCheckoutSuccessContent('fr')).toEqual({
      title: 'Commande confirmée !',
      description:
        'Merci pour votre achat. Vous recevrez un email de confirmation prochainement.',
      ctaLabel: 'Retour à la boutique',
      ctaHref: '/fr/boutique',
    })
  })

  it('builds english success content and shop link', () => {
    expect(getCheckoutSuccessContent('en')).toEqual({
      title: 'Order confirmed!',
      description:
        'Thank you for your purchase. You will receive a confirmation email shortly.',
      ctaLabel: 'Back to shop',
      ctaHref: '/en/boutique',
    })
  })

  it('builds french cancel content and links', () => {
    expect(getCheckoutCancelContent('fr')).toEqual({
      title: 'Paiement annulé',
      description:
        'Votre panier a été conservé. Vous pouvez reprendre votre commande à tout moment.',
      cartLabel: 'Retour au panier',
      cartHref: '/fr/panier',
      shopLabel: 'Continuer mes achats',
      shopHref: '/fr/boutique',
    })
  })

  it('builds english cancel content and links', () => {
    expect(getCheckoutCancelContent('en')).toEqual({
      title: 'Payment cancelled',
      description:
        'Your cart has been saved. You can resume your order at any time.',
      cartLabel: 'Back to cart',
      cartHref: '/en/panier',
      shopLabel: 'Continue shopping',
      shopHref: '/en/boutique',
    })
  })
})
