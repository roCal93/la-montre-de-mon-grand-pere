import { redirect } from 'next/navigation'

export default async function EspaceClientRootPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}/espace-client/tableau-de-bord`)
}
