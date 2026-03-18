import type { NextConfig } from 'next'

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
      .forEach((u) => set.add(u))
  } else {
    set.add(strapiOrigin)
    if (!strapiOrigin.includes('localhost')) {
      const host = strapiOrigin.replace(/^https?:\/\//, '').replace(/\/$/, '')
      const base = host.replace(/^www\./, '')
      set.add(`https://${base}`)
      set.add(`https://www.${base}`)
      set.add(`https://*.${base}`)
    }
  }

  return Array.from(set)
}

const nextConfig: NextConfig = {
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
      {
        protocol: 'https',
        hostname: 'traduction-amanda-production.up.railway.app',
        pathname: '/uploads/**',
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
    const strapiOrigin =
      process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
    const isProd = process.env.NODE_ENV === 'production'

    // Note: we rely on CSP `frame-ancestors` for iframe control (X-Frame-Options
    // cannot express multiple allowed origins and would break Strapi preview embeds).
    //
    // ⚠️ Security note: 'unsafe-inline' is kept for compatibility with Next.js inline scripts
    // For production, consider implementing nonces or moving to Next.js App Router with CSP support
    const csp = [
      "default-src 'self';",
      `img-src 'self' data: https: ${strapiOrigin};`,
      `script-src 'self' 'unsafe-inline' https://vercel.live${isProd ? '' : " 'unsafe-eval'"};`,
      "style-src 'self' 'unsafe-inline';",
      `connect-src 'self' ${strapiOrigin} https://*.railway.app https://*.vercel.app;`,
      "font-src 'self' data:;",
      "object-src 'none';",
      "base-uri 'self';",
      "form-action 'self';",
      'upgrade-insecure-requests;',
      `frame-ancestors 'self' ${getAllowedOrigins().join(' ')};`,
    ].join(' ')

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
      {
        key: 'Content-Security-Policy',
        value: csp.replace(/\s{2,}/g, ' ').trim(),
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
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
