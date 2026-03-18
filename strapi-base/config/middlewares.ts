export default [
  // Append Cloudinary to any CSP header returned by Strapi (helps ensure admin loads remote images)
  {
    name: 'global::append-cloudinary-csp',
    config: {},
  },
  'strapi::logger',
  'strapi::errors',
  // Security middleware with relaxed CSP for local preview & dev tooling
  {
    name: 'strapi::security',
    config: ({ env }) => {
      // Prefer explicit ALLOWED_ORIGINS from env (Railway) if provided
      const allowedEnv = process.env.ALLOWED_ORIGINS || env('ALLOWED_ORIGINS');
      const clientUrl = env('CLIENT_URL', 'http://localhost:3000');
      const clientUrlsSet = new Set<string>();

      if (allowedEnv) {
        allowedEnv
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((u) => clientUrlsSet.add(u));
      } else {
        clientUrlsSet.add(clientUrl);

        // For non-localhost hosts, add the apex, www and wildcard subdomain variants
        if (!clientUrl.includes('localhost')) {
          const host = clientUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
          const base = host.replace(/^www\./, '');
          clientUrlsSet.add(`https://${base}`);
          clientUrlsSet.add(`https://www.${base}`);
          clientUrlsSet.add(`https://*.${base}`);
        }
      }

      const clientUrls = Array.from(clientUrlsSet);

      return {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            // Allow the frontend (CLIENT_URL / ALLOWED_ORIGINS) to be framed inside Strapi admin preview
            'frame-ancestors': ["'self'", ...clientUrls],
            // Allow embedding/iframes from the frontend
            'frame-src': ["'self'", ...clientUrls],
            // Allow inline scripts (needed for Strapi admin live dev client) in dev only
            // In production we allow Vercel live scripts (used for preview & feedback)
            'script-src': env('NODE_ENV') === 'production'
              ? ["'self'", 'https://vercel.live']
              : ["'self'", "'unsafe-inline'", 'http://localhost:5173'],
            // Allow Vite websocket & admin to connect to local dev servers
            'connect-src': env('NODE_ENV') === 'production'
              ? ["'self'", 'https:']
              : ["'self'", 'https:', 'ws://localhost:5173', 'http://localhost:5173'],
            // Allow images/media from Cloudinary in production
            'img-src': env('NODE_ENV') === 'production'
              ? ["'self'", 'data:', 'https://res.cloudinary.com', 'https://market-assets.strapi.io']
              : ["'self'", 'data:', 'blob:', 'http://localhost:5173', 'https://res.cloudinary.com', 'https://market-assets.strapi.io'],
            'media-src': env('NODE_ENV') === 'production'
              ? ["'self'", 'data:', 'https://res.cloudinary.com']
              : ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
            // Objects (PDFs embeds): allow Cloudinary
            'object-src': ["'self'", 'https://res.cloudinary.com'],
          },
        },
      };
    },
  },

  {
    name: 'strapi::cors',
    config: {
      // Allow a set of known origins in production, plus Vercel previews via regex.
      origin: (ctx: any) => {
        const requestOrigin = ctx.request.header.origin;
        if (!requestOrigin) return '*';

        const allowed = process.env.ALLOWED_ORIGINS?.split(',') || [
          'https://yourdomain.com',
        ];

        const vercelPreview = /^https:\/\/.*\.vercel\.app$/;

        return allowed.includes(requestOrigin) || vercelPreview.test(requestOrigin)
          ? requestOrigin
          : '';
      },
      headers: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
