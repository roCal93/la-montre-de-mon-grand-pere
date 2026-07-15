import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Layout } from '@/components/layout'
import { BackButton } from '@/components/shared/BackButton'
import { fetchAPI } from '@/lib/strapi'
import { defaultLocale } from '@/lib/locales'
import { formatLegalContent } from '@/lib/format-legal-content'

type GarantieData = {
  title?: string
  content?: string
  lastUpdated?: string
}

type GarantieResponse = {
  data?: GarantieData | null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const response = await fetchAPI<GarantieResponse>('/garantie', {
    locale,
    next: { revalidate: 60 },
  })
  const title = response?.data?.title
  return title ? { title } : {}
}

export default async function GarantiePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const response = await fetchAPI<GarantieResponse>('/garantie', {
    locale,
    next: { revalidate: 60 },
  })

  let data = response?.data

  if ((!data?.title || !data?.content) && locale !== defaultLocale) {
    const fallbackResponse = await fetchAPI<GarantieResponse>('/garantie', {
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
      <section className="bg-gray-50 px-4 py-20 dark:bg-neutral-950">
        <div className="max-w-4xl mx-auto">
          <BackButton locale={locale} />
          <div className="rounded-xl border border-gray-200 bg-white p-6 md:p-10 text-gray-900 text-left shadow-sm dark:bg-neutral-900 dark:border-neutral-700 dark:text-white">
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
        </div>
      </section>
    </Layout>
  )
}
