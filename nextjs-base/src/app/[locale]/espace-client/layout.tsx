import { auth } from '@/auth'
import { EspaceClientSidebar } from '@/components/espace-client/EspaceClientSidebar'
import { Layout } from '@/components/layout'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'

interface Props {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return {
    title: locale === 'fr' ? 'Espace client' : 'Customer area',
  }
}

export default async function EspaceClientLayout({ children, params }: Props) {
  const { locale } = await params
  const session = await auth()
  const headersList = await headers()
  const cookieStore = await cookies()
  const pathname = headersList.get('x-pathname') ?? ''
  const hasAuthCookie = cookieStore
    .getAll()
    .some(
      (cookie) =>
        cookie.name === 'authjs.session-token' ||
        cookie.name === '__Secure-authjs.session-token' ||
        cookie.name.startsWith('authjs.session-token.') ||
        cookie.name.startsWith('__Secure-authjs.session-token.')
    )
  const hasStrapiCookie = cookieStore.get('strapi_session_jwt')?.value != null

  const authPaths = ['/connexion', '/inscription', '/mot-de-passe-oublie']
  const isAuthPage = authPaths.some((p) => pathname.endsWith(p))

  // Logged-in user on an auth page → send to dashboard
  if (session && isAuthPage) {
    console.info('[espace-client] redirect authenticated user away from auth page', {
      pathname,
      email: session.user.email,
      hasAuthCookie,
      hasStrapiCookie,
    })
    redirect(`/${locale}/espace-client/tableau-de-bord`)
  }

  // Unauthenticated user on a protected page → send to login
  if (!session && !isAuthPage) {
    console.warn('[espace-client] redirect unauthenticated user to login', {
      pathname,
      hasAuthCookie,
      hasStrapiCookie,
    })
    redirect(`/${locale}/espace-client/connexion`)
  }

  // Auth pages (connexion, inscription, mot-de-passe-oublie) shown without sidebar
  if (!session) {
    return <Layout locale={locale}>{children}</Layout>
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-neutral-950">
      <EspaceClientSidebar locale={locale} />

      <main className="flex-1 min-w-0 px-4 py-8 md:px-8 md:py-10">
        <div className="mb-6 font-[family-name:var(--font-geist-mono)] text-[15px] uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500">
          Connecté :{' '}
          <span className="text-neutral-600 dark:text-neutral-300">
            {session.user.email}
          </span>
        </div>
        {children}
      </main>
    </div>
  )
}
