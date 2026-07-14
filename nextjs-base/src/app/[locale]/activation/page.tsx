import { redirect } from 'next/navigation'

export default async function ActivationShortEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ code?: string }>
}) {
  const { locale } = await params
  const { code } = await searchParams

  const query = new URLSearchParams()
  if (code?.trim()) {
    query.set('code', code.trim())
  }

  const suffix = query.toString() ? `?${query.toString()}` : ''
  redirect(`/${locale}/espace-client/activation${suffix}`)
}
