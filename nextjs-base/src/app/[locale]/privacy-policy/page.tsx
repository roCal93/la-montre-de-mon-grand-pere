import { notFound } from 'next/navigation'
import { Layout } from '@/components/layout'
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

export const dynamic = 'force-dynamic'

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
      <section className="bg-gray-50 px-4 py-20">
        <div className="max-w-4xl ml-auto mr-4 md:mr-10 rounded-xl border border-gray-200 bg-white p-6 md:p-10 text-gray-900 text-left shadow-sm">
          <h1 className="text-3xl md:text-4xl font-semibold mb-6">
            {policy.title}
          </h1>
          {policy.lastUpdated && (
            <p className="text-sm text-gray-600 mb-6">
              {locale === 'en' ? 'Last updated:' : 'Derniere mise a jour :'}{' '}
              {policy.lastUpdated}
            </p>
          )}
          <article
            className="prose max-w-none text-left"
            dangerouslySetInnerHTML={{
              __html: formatLegalContent(policy.content || ''),
            }}
          />
        </div>
      </section>
    </Layout>
  )
}
