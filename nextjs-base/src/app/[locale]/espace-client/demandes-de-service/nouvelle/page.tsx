'use server'

import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { strapiAuthGet } from '@/lib/strapi-auth-client'
import { NouvelleDemandeForm } from './NouvelleDemandeForm'

interface WatchFile {
  documentId: string
  title: string
  product?: { name: string }
}

export default async function NouvelleDemandeServicePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session) redirect(`/${locale}/espace-client/connexion`)

  const { data } = await strapiAuthGet<{ data: WatchFile[] }>(
    '/watch-files?fields[0]=title&sort=createdAt:desc&populate[product][fields][0]=name',
    0
  )
  const watchFiles = data?.data ?? []

  return <NouvelleDemandeForm locale={locale} watchFiles={watchFiles} />
}
