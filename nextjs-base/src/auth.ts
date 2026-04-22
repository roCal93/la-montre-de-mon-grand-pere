import NextAuth, { CredentialsSignin, type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  authenticateStrapiUser,
  getStrapiUserFromJwt,
} from '@/lib/strapi-login'
import { STRAPI_SESSION_COOKIE } from '@/lib/strapi-session-cookie'

function getAuthCookieDomain() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) return undefined

  const hostname = new URL(siteUrl).hostname
  if (hostname === 'localhost' || !hostname.includes('.')) {
    return undefined
  }

  return hostname.startsWith('www.') ? `.${hostname.slice(4)}` : `.${hostname}`
}

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

const authCookieDomain = getAuthCookieDomain()
const useSecureCookies = process.env.NODE_ENV === 'production'
const sessionCookieName = useSecureCookies
  ? '__Secure-authjs.session-token'
  : 'authjs.session-token'

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

        const existingStrapiJwt = getCookieValue(
          request?.headers?.get('cookie') ?? null,
          STRAPI_SESSION_COOKIE
        )
        if (existingStrapiJwt) {
          const strapiUser = await getStrapiUserFromJwt(existingStrapiJwt)

          if (strapiUser) {
            return {
              id: String(strapiUser.id),
              email: strapiUser.email,
              name: strapiUser.username,
            }
          }
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
  cookies: {
    sessionToken: {
      name: sessionCookieName,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        ...(authCookieDomain ? { domain: authCookieDomain } : {}),
      },
    },
  },
  secret: process.env.AUTH_SECRET,
})
