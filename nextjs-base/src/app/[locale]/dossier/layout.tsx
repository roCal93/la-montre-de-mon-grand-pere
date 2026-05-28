import { Layout } from '@/components/layout'

interface Props {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function DossierLayout({ children, params }: Props) {
  const { locale } = await params
  return (
    <Layout locale={locale}>
      <main className="mx-auto max-w-5xl mb-10 px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </main>
    </Layout>
  )
}
