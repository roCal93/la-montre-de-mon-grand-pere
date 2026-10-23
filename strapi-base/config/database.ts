export default ({ env }) => {
  const client = env('DATABASE_CLIENT', 'sqlite')

  if (client === 'sqlite') {
    return {
      connection: {
        client: 'sqlite',
        connection: {
          filename: env('DATABASE_FILENAME', '.tmp/data.db'),
        },
        useNullAsDefault: true,
      },
    }
  }

  // Configuration PostgreSQL pour Railway
  const databaseUrl = env('DATABASE_URL')
  const isRailwayPrivateNetwork = databaseUrl
    ? new URL(databaseUrl).hostname.endsWith('.railway.internal')
    : false
  const connection = databaseUrl
    ? {
        connectionString: databaseUrl,
        // Railway private networking does not require PostgreSQL SSL.
        // Keep the existing TLS behavior for external production connections.
        ssl: isRailwayPrivateNetwork
          ? false
          : env('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }
    : {
        // Configuration manuelle
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) && {
          rejectUnauthorized: env.bool('DATABASE_SSL_SELF', false),
        },
      }

  return {
    connection: {
      client: 'postgres',
      connection,
      debug: false,
    },
  }
}
