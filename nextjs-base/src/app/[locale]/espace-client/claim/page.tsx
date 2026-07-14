import { getCurrentStrapiUser } from '@/lib/strapi-session-cookie'
import { ClaimPageClient } from './ClaimPageClient'

export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { locale } = await params
  const { token } = await searchParams
  const strapiUser = await getCurrentStrapiUser()

  return (
    <ClaimPageClient
      locale={locale}
      token={token ?? ''}
      isAuthenticated={Boolean(strapiUser)}
    />
  )
}
