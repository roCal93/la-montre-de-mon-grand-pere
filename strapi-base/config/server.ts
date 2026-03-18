export default ({ env }) => {
  const nodeEnv = env('NODE_ENV', 'development')
  const isProd = nodeEnv === 'production'

  const previewSecret = env('PREVIEW_SECRET') || (isProd ? undefined : 'dev-preview-secret')
  if (!previewSecret) {
    throw new Error('Missing PREVIEW_SECRET (required in production for preview integration)')
  }

  return {
    host: env('HOST', '0.0.0.0'),
    port: env.int('PORT', 1337),
    url: env('STRAPI_URL', 'http://localhost:1337'),
    app: {
      keys: env.array('APP_KEYS'),
    },
    preview: {
      enabled: true,
      config: {
        secret: previewSecret,
      },
    },
  }
};
