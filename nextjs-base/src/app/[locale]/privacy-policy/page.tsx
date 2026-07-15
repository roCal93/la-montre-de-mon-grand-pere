import { notFound } from 'next/navigation'
import { Layout } from '@/components/layout'
import { BackButton } from '@/components/shared/BackButton'
import { fetchAPI } from '@/lib/strapi'
import { defaultLocale } from '@/lib/locales'
import { formatLegalContent } from '@/lib/format-legal-content'

type PolicyData = {
  title?: string
  content?: string
  lastUpdated?: string
}

type PolicyResponse = {
  data?: PolicyData | null
}

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const response = await fetchAPI<PolicyResponse>('/privacy-policy', {
    locale,
    next: { revalidate: 60 },
  })

  let policy = response?.data

  if ((!policy?.title || !policy?.content) && locale !== defaultLocale) {
    const fallbackResponse = await fetchAPI<PolicyResponse>('/privacy-policy', {
      locale: defaultLocale,
      next: { revalidate: 60 },
    })
    policy = fallbackResponse?.data
  }

  if (!policy?.title || !policy?.content) {
    notFound()
  }

  return (
    <Layout locale={locale}>
      <section className="bg-gray-50 px-4 py-20 dark:bg-neutral-950">
        <div className="max-w-4xl mx-auto">
          <BackButton locale={locale} />
          <div className="rounded-xl border border-gray-200 bg-white p-6 md:p-10 text-gray-900 text-left shadow-sm dark:bg-neutral-900 dark:border-neutral-700 dark:text-white">
            <h1 className="text-3xl md:text-4xl font-semibold mb-6">
              {policy.title}
            </h1>
            {policy.lastUpdated && (
              <p className="text-sm text-gray-600 mb-6">
                {locale === 'en' ? 'Last updated:' : 'Dernière mise à jour :'}{' '}
                {new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                }).format(new Date(policy.lastUpdated))}
              </p>
            )}
            <article
              className="prose max-w-none text-left"
              dangerouslySetInnerHTML={{
                __html: formatLegalContent(policy.content || ''),
              }}
            />
          </div>
        </div>
      </section>
    </Layout>
  )
}
