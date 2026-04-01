import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Layout } from '@/components/layout'
import { fetchAPI } from '@/lib/strapi'
import { defaultLocale } from '@/lib/locales'
import { formatLegalContent } from '@/lib/format-legal-content'

type LivraisonData = {
  title?: string
  content?: string
  lastUpdated?: string
}

type LivraisonResponse = {
  data?: LivraisonData | null
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const response = await fetchAPI<LivraisonResponse>('/livraison', {
    locale,
    next: { revalidate: 60 },
  })
  const title = response?.data?.title
  return title ? { title } : {}
}

export default async function LivraisonPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const response = await fetchAPI<LivraisonResponse>('/livraison', {
    locale,
    next: { revalidate: 60 },
  })

  let data = response?.data

  if ((!data?.title || !data?.content) && locale !== defaultLocale) {
    const fallbackResponse = await fetchAPI<LivraisonResponse>('/livraison', {
      locale: defaultLocale,
      next: { revalidate: 60 },
    })
    data = fallbackResponse?.data
  }

  if (!data?.title || !data?.content) {
    notFound()
  }

  return (
    <Layout locale={locale}>
      <section className="bg-gray-50 px-4 py-20">
        <div className="max-w-4xl ml-auto mr-4 md:mr-10 rounded-xl border border-gray-200 bg-white p-6 md:p-10 text-gray-900 text-left shadow-sm">
          <h1 className="text-3xl md:text-4xl font-semibold mb-6">
            {data.title}
          </h1>
          {data.lastUpdated && (
            <p className="text-sm text-gray-600 mb-6">
              {locale === 'en' ? 'Last updated:' : 'Dernière mise à jour :'}{' '}
              {data.lastUpdated}
            </p>
          )}
          <article
            className="prose max-w-none text-left"
            dangerouslySetInnerHTML={{
              __html: formatLegalContent(data.content || ''),
            }}
          />
        </div>
      </section>
    </Layout>
  )
}
