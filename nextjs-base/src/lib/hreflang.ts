import { locales, defaultLocale } from './locales'

/**
 * Generates hreflang alternate links for multilingual SEO
 * @param slug - The page slug (e.g., 'home', 'about', 'services')
 * @param localizations - Optional array of locale/slug pairs from Strapi
 * @returns Alternates object for Next.js metadata
 */
export function getHreflangAlternates(
  slug: string,
  localizations?: Array<{ locale: string; slug: string }>
) {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  ).replace(/\/$/, '')

  const languages: Record<string, string> = {}

  // If localizations are provided from Strapi, use them
  if (localizations && localizations.length > 0) {
    localizations.forEach((loc) => {
      const path = loc.slug === 'home' ? '' : `/${loc.slug}`
      languages[loc.locale] = `${siteUrl}/${loc.locale}${path}`
    })
  } else {
    // Fallback: use same slug for all locales
    locales.forEach((locale) => {
      const path = slug === 'home' ? '' : `/${slug}`
      languages[locale] = `${siteUrl}/${locale}${path}`
    })
  }

  // Add x-default (fallback for unmatched locales)
  const defaultPath = slug === 'home' ? '' : `/${slug}`
  languages['x-default'] = `${siteUrl}/${defaultLocale}${defaultPath}`

  return {
    languages,
  }
}
