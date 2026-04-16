import type { NextConfig } from 'next'

function normalizeOrigin(input: string): string | null {
  try {
    return new URL(input).origin
  } catch {
    return null
  }
}

function getAllowedOrigins() {
  const allowedEnv =
    process.env.ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_ALLOWED_ORIGINS
  const strapiOrigin =
    process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
  const set = new Set<string>()

  if (allowedEnv) {
    allowedEnv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((u) => {
        const origin = normalizeOrigin(u)
        if (origin) set.add(origin)
      })
  } else {
    const strapi = normalizeOrigin(strapiOrigin)
    if (strapi) set.add(strapi)
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    'http://localhost:3000'
  const siteOrigin = normalizeOrigin(siteUrl)
  if (siteOrigin) set.add(siteOrigin)

  return Array.from(set)
}

function getSiteOrigin(): string {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    'http://localhost:3000'
  return normalizeOrigin(siteUrl) || 'http://localhost:3000'
}

const nextConfig: NextConfig = {
  // Force @react-pdf/renderer to be bundled (it's ESM-only and can't be externalized)
  transpilePackages: ['@react-pdf/renderer'],

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '1337',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
    unoptimized: process.env.NODE_ENV === 'development', // Activer l'optimisation en production
    formats: ['image/webp', 'image/avif'], // Formats modernes pour réduire la taille
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 85], // Qualités d'images autorisées
  },

  // Optimisations de performance
  compress: true, // Activer la compression Gzip/Brotli
  poweredByHeader: false, // Supprimer l'en-tête X-Powered-By

  // For Turbopack: explicitly set workspace root to this Next app to avoid
  // module resolution issues when the repo contains multiple lockfiles.
  // See https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
  turbopack: {
    root: __dirname,
  } as const,

  // Autoriser l'admin Strapi à intégrer le site en iframe pour la Preview
  async headers() {
    const siteOrigin = getSiteOrigin()
    const isProd = process.env.NODE_ENV === 'production'

    // Content-Security-Policy is set dynamically per request in middleware.ts
    // (nonce-based CSP cannot be a static build-time header)
    const securityHeaders: { key: string; value: string }[] = [
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'geolocation=(), microphone=(), camera=()',
      },
    ]

    if (isProd) {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      })
    }

    return [
      {
        source: '/robots.txt',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: siteOrigin,
          },
          {
            key: 'Vary',
            value: 'Origin',
          },
        ],
      },
      {
        source: '/sitemap.xml',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: siteOrigin,
          },
          {
            key: 'Vary',
            value: 'Origin',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
