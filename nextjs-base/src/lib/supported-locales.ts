import { unstable_cache } from 'next/cache'
import { defaultLocale, locales as staticLocales } from './locales'

function uniq(values: string[]) {
  return Array.from(new Set(values))
}

type StrapiLocalesConfig = {
  locales: string[]
  defaultLocale?: string
}

type StrapiLocaleItem = {
  code?: unknown
  name?: unknown
  isDefault?: unknown
  attributes?: {
    code?: unknown
    name?: unknown
    isDefault?: unknown
  }
}

function parseStrapiLocaleItem(item: StrapiLocaleItem): {
  code?: string
  isDefault?: boolean
} {
  const code = item.code ?? item.attributes?.code
  const isDefault = item.isDefault ?? item.attributes?.isDefault

  return {
    code: typeof code === 'string' && code.length > 0 ? code : undefined,
    isDefault: typeof isDefault === 'boolean' ? isDefault : undefined,
  }
}

async function fetchLocalesConfigFromStrapi(): Promise<StrapiLocalesConfig> {
  const apiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
  const url = `${apiUrl.replace(/\/$/, '')}/api/i18n/locales`

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  const token = process.env.STRAPI_API_TOKEN
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(url, {
    headers,
    cache: 'no-store',
  })

  if (!res.ok) {
    return { locales: [] }
  }

  const json: unknown = await res.json()

  if (Array.isArray(json)) {
    const parsed = (json as StrapiLocaleItem[]).map(parseStrapiLocaleItem)
    const locales = parsed
      .map((p) => p.code)
      .filter(
        (code): code is string => typeof code === 'string' && code.length > 0
      )

    const defaultFromStrapi = parsed.find((p) => p.isDefault)?.code

    return {
      locales,
      defaultLocale:
        typeof defaultFromStrapi === 'string' ? defaultFromStrapi : undefined,
    }
  }

  const data = (json as { data?: unknown })?.data
  if (Array.isArray(data)) {
    const parsed = (data as StrapiLocaleItem[]).map(parseStrapiLocaleItem)
    const locales = parsed
      .map((p) => p.code)
      .filter(
        (code): code is string => typeof code === 'string' && code.length > 0
      )

    const defaultFromStrapi = parsed.find((p) => p.isDefault)?.code

    return {
      locales,
      defaultLocale:
        typeof defaultFromStrapi === 'string' ? defaultFromStrapi : undefined,
    }
  }

  return { locales: [] }
}

export const getLocalesConfig = unstable_cache(
  async () => {
    const fromStrapi = await fetchLocalesConfigFromStrapi().catch(() => ({
      locales: [],
      defaultLocale: undefined,
    }))

    const staticList = [...(staticLocales as readonly string[])]

    // Source of truth: Strapi locales. If Strapi is unreachable, fallback to static locales.
    const candidateLocales =
      fromStrapi.locales.length > 0 ? fromStrapi.locales : staticList

    // Keep only locales that the frontend is known to support.
    const filteredLocales = candidateLocales.filter((l) =>
      staticList.includes(l)
    )

    const locales =
      filteredLocales.length > 0 ? uniq(filteredLocales) : uniq(staticList)

    const strapiDefault = fromStrapi.defaultLocale
    const resolvedDefaultLocale =
      typeof strapiDefault === 'string' && locales.includes(strapiDefault)
        ? strapiDefault
        : defaultLocale

    return {
      locales,
      defaultLocale: resolvedDefaultLocale,
    }
  },
  ['locales-config'],
  { revalidate: 60 * 60 }
)

export const getSupportedLocales = unstable_cache(
  async () => {
    const { locales } = await getLocalesConfig()
    return locales
  },
  ['supported-locales'],
  { revalidate: 60 * 60 }
)

export async function isSupportedLocale(locale: string): Promise<boolean> {
  const supported = await getSupportedLocales()
  return supported.includes(locale)
}

export { defaultLocale }
