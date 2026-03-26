import { auth } from '@/auth'
import { EspaceClientSidebar } from '@/components/espace-client/EspaceClientSidebar'

interface Props {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function EspaceClientLayout({ children, params }: Props) {
  const { locale } = await params
  const session = await auth()

  //Auth pages (connexion, inscription, mot-de-passe-oublie) are accessible without session.
  // The middleware ensures only those pages pass through unauthenticated.
  if (!session) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="flex">
        <EspaceClientSidebar locale={locale} />

        <main className="flex-1 min-w-0 px-4 py-8 md:px-8 md:py-10 max-w-4xl">
          <div className="mb-6 text-xs text-stone-500">
            Connecté en tant que{' '}
            <span className="font-medium text-stone-700">
              {session.user.email}
            </span>
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
