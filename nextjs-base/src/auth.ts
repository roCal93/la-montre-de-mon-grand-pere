import NextAuth, { CredentialsSignin, type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { checkRateLimit } from '@/lib/rate-limit'
import { authenticateStrapiUser } from '@/lib/strapi-login'

declare module 'next-auth' {
  interface Session {
    user: NonNullable<DefaultSession['user']> & {
      email: string
      name: string
    }
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials, request) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined

        if (!email || !password)
          throw new CredentialsSignin('Email et mot de passe requis')

        const normalizedEmail = email.trim().toLowerCase()
        // Prefer x-vercel-forwarded-for (injected by Vercel, not spoofable by clients)
        // over x-forwarded-for which can be spoofed behind untrusted proxies
        const ip =
          request?.headers?.get('x-vercel-forwarded-for') ||
          request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          request?.headers?.get('x-real-ip') ||
          'unknown'

        const rateLimit = await checkRateLimit({
          key: `auth:${normalizedEmail}:${ip}`,
          limit: 5,
          windowMs: 15 * 60 * 1000,
        })
        if (!rateLimit.allowed) {
          throw new CredentialsSignin('Trop de tentatives, reessayez plus tard')
        }

        const result = await authenticateStrapiUser(normalizedEmail, password)

        if (!result) {
          throw new CredentialsSignin('Email ou mot de passe incorrect')
        }

        return {
          id: String(result.user.id),
          email: result.user.email,
          name: result.user.username,
        }
      },
    }),
  ],

  pages: {
    signIn: '/fr/espace-client/connexion',
    error: '/fr/espace-client/connexion',
  },

  session: { strategy: 'jwt' },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
})
