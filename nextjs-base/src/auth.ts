import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import type { Session, User } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import { checkRateLimit } from '@/lib/rate-limit'

type StrapiJWT = JWT & {
  strapiJwt?: string
  strapiDocumentId?: string
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      strapiJwt: string
      strapiDocumentId: string
    }
  }
  interface User {
    strapiJwt: string
    strapiDocumentId: string
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

        const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL
        if (!strapiUrl) throw new Error('NEXT_PUBLIC_STRAPI_URL manquante')

        const res = await fetch(`${strapiUrl}/api/auth/local`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: normalizedEmail, password }),
        })

        if (!res.ok) {
          throw new CredentialsSignin('Email ou mot de passe incorrect')
        }

        const data = (await res.json()) as {
          jwt: string
          user: {
            id: number
            documentId: string
            email: string
            username: string
          }
        }

        return {
          id: String(data.user.id),
          email: data.user.email,
          name: data.user.username,
          strapiJwt: data.jwt,
          strapiDocumentId: data.user.documentId,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }: { token: StrapiJWT; user?: User }) {
      if (user) {
        token.strapiJwt = user.strapiJwt
        token.strapiDocumentId = user.strapiDocumentId
      }
      return token
    },
    async session({ session, token }: { session: Session; token: StrapiJWT }) {
      session.user.strapiJwt = token.strapiJwt ?? ''
      session.user.strapiDocumentId = token.strapiDocumentId ?? ''
      return session
    },
  },

  pages: {
    signIn: '/fr/espace-client/connexion',
    error: '/fr/espace-client/connexion',
  },

  session: { strategy: 'jwt' },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
})
