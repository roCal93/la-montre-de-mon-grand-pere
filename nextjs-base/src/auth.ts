import NextAuth, { CredentialsSignin, type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  authenticateStrapiUser,
  getStrapiUserFromJwt,
} from '@/lib/strapi-login'
import { STRAPI_SESSION_COOKIE } from '@/lib/strapi-session-cookie'

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null

  const prefix = `${name}=`
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length))
    }
  }

  return null
}

declare module 'next-auth' {
  interface User {
    strapiJwt?: string
  }
  interface Session {
    user: NonNullable<DefaultSession['user']> & {
      id: string
      email: string
      name: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    strapiJwt?: string
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

        const existingStrapiJwt = getCookieValue(
          request?.headers?.get('cookie') ?? null,
          STRAPI_SESSION_COOKIE
        )
        if (existingStrapiJwt) {
          if (process.env.NODE_ENV !== 'production') {
            console.info('[auth] authorize using existing Strapi cookie')
          }
          const strapiUser = await getStrapiUserFromJwt(existingStrapiJwt)

          if (strapiUser) {
            if (process.env.NODE_ENV !== 'production') {
              console.info('[auth] authorize resolved user from Strapi cookie')
            }
            return {
              id: String(strapiUser.id),
              email: strapiUser.email,
              name: strapiUser.username,
              strapiJwt: existingStrapiJwt,
            }
          }

          if (process.env.NODE_ENV !== 'production') {
            console.warn('[auth] existing Strapi cookie rejected by /users/me')
          }
        }

        const result = await authenticateStrapiUser(normalizedEmail, password)

        if (!result) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[auth] authorize credentials rejected by Strapi')
          }
          throw new CredentialsSignin('Email ou mot de passe incorrect')
        }

        if (process.env.NODE_ENV !== 'production') {
          console.info('[auth] authorize credentials accepted by Strapi')
        }

        return {
          id: String(result.user.id),
          email: result.user.email,
          name: result.user.username,
          strapiJwt: result.jwt,
        }
      },
    }),
  ],

  pages: {
    signIn: '/fr/espace-client/connexion',
    error: '/fr/espace-client/connexion',
  },

  session: {
    strategy: 'jwt',
    // Limit session lifetime so a compromised or stale session
    // (e.g. after a Strapi password change) expires within hours, not 30 days.
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 60 * 60, // Re-issue JWT every hour of activity
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-authjs.session-token'
          : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id
      }
      if (user?.strapiJwt) {
        token.strapiJwt = user.strapiJwt
      }

      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }

      return session
    },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
})
