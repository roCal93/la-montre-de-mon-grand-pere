import { defineRouting } from 'next-intl/routing'

const isProd = process.env.NODE_ENV === 'production'

export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localeCookie: {
    name: 'NEXT_LOCALE',
    path: '/',
    sameSite: 'lax',
    secure: isProd,
    maxAge: 60 * 60 * 24 * 365,
  },
  pathnames: {
    '/blog': {
      fr: '/blog',
      en: '/blog',
    },
    '/blog/[slug]': {
      fr: '/blog/[slug]',
      en: '/blog/[slug]',
    },
    '/boutique': {
      fr: '/boutique',
      en: '/shop',
    },
    '/boutique/[slug]': {
      fr: '/boutique/[slug]',
      en: '/shop/[slug]',
    },
    '/panier': {
      fr: '/panier',
      en: '/cart',
    },
    '/checkout/success': '/checkout/success',
    '/checkout/cancel': '/checkout/cancel',
  },
})
