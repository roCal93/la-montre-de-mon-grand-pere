import { notFound } from 'next/navigation'
import { Layout } from '@/components/layout'
import { BackButton } from '@/components/shared/BackButton'
import { fetchAPI } from '@/lib/strapi'
import { defaultLocale } from '@/lib/locales'
import { formatLegalContent } from '@/lib/format-legal-content'

type LegalData = {
  title?: string
  content?: string
  lastUpdated?: string
}

type LegalResponse = {
  data?: LegalData | null
}

export default async function LegalNoticePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const response = await fetchAPI<LegalResponse>('/legal-notice', {
    locale,
    next: { revalidate: 60 },
  })

  let legal = response?.data

  if ((!legal?.title || !legal?.content) && locale !== defaultLocale) {
    const fallbackResponse = await fetchAPI<LegalResponse>('/legal-notice', {
      locale: defaultLocale,
      next: { revalidate: 60 },
    })
    legal = fallbackResponse?.data
  }

  if (!legal?.title || !legal?.content) {
    notFound()
  }

  return (
    <Layout locale={locale}>
      <section className="bg-gray-50 px-4 py-20 dark:bg-neutral-950">
        <div className="max-w-4xl mx-auto">
          <BackButton locale={locale} />
          <div className="rounded-xl border border-gray-200 bg-white p-6 md:p-10 text-gray-900 text-left shadow-sm dark:bg-neutral-900 dark:border-neutral-700 dark:text-white">
            <h1 className="text-3xl md:text-4xl font-semibold mb-6">
              {legal.title}
            </h1>
            {legal.lastUpdated && (
              <p className="text-sm text-gray-600 mb-6">
                {locale === 'en' ? 'Last updated:' : 'Dernière mise à jour :'}{' '}
                {new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                }).format(new Date(legal.lastUpdated))}
              </p>
            )}
            <article
              className="prose max-w-none text-left"
              dangerouslySetInnerHTML={{
                __html: formatLegalContent(legal.content || ''),
              }}
            />
          </div>
        </div>
      </section>
    </Layout>
  )
}
