import type { MetadataRoute } from 'next'

const siteBase = (() => {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    'http://localhost:3000'
  if (
    process.env.NODE_ENV === 'production' &&
    !process.env.NEXT_PUBLIC_SITE_URL &&
    !process.env.SITE_URL
  ) {
    console.error(
      '[robots.ts] NEXT_PUBLIC_SITE_URL is not set — sitemap URL will be wrong in production'
    )
  }
  return url.replace(/\/$/, '')
})()

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/*/espace-client/', '/espace-client/'],
      },
    ],
    sitemap: `${siteBase}/sitemap.xml`,
  }
}
