import { EspaceClientSidebar } from '@/components/espace-client/EspaceClientSidebar'
import { Layout } from '@/components/layout'
import { getCurrentStrapiUser } from '@/lib/strapi-session-cookie'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

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
  const strapiUser = await getCurrentStrapiUser()
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''

  const authPaths = ['/connexion', '/inscription', '/mot-de-passe-oublie']
  const isAuthPage = authPaths.some((p) => pathname.endsWith(p))

  // Logged-in user on an auth page → send to dashboard
  if (strapiUser && isAuthPage) {
    redirect(`/${locale}/espace-client/tableau-de-bord`)
  }

  // Unauthenticated user on a protected page → send to login
  if (!strapiUser && !isAuthPage) {
    redirect(`/${locale}/espace-client/connexion`)
  }

  // Auth pages (connexion, inscription, mot-de-passe-oublie) shown without sidebar
  if (!strapiUser) {
    return <Layout locale={locale}>{children}</Layout>
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-neutral-950">
      <EspaceClientSidebar locale={locale} />

      <main className="flex-1 min-w-0 px-4 py-8 md:px-8 md:py-10">
        <div className="mb-6 font-[family-name:var(--font-geist-mono)] text-[15px] uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500">
          Connecté :{' '}
          <span className="text-neutral-600 dark:text-neutral-300">
            {strapiUser.email}
          </span>
        </div>
        {children}
      </main>
    </div>
  )
}
