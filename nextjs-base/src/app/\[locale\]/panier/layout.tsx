import type { Metadata } from 'next'

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

  const title = locale === 'fr' ? 'Mon Panier' : 'My Cart'
  const description =
    locale === 'fr'
      ? 'Gérez vos articles et procédez au paiement sécurisé de votre commande.'
      : 'Manage your items and proceed to secure checkout.'

  return {
    title: `${title} - La Montre de mon Grand-Père`,
    description,
    robots: 'noindex, follow', // Important: ne pas indexer les pages du panier
  }
}

export default async function PanierLayout({ children }: Props) {
  return <>{children}</>
}
