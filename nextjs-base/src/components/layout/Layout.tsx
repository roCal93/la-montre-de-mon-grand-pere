import React, { ReactNode } from 'react'
import { Header } from '@/components/sections/Header'
import { Footer } from '@/components/sections/Footer'
import { SkipToContent } from '@/components/ui/SkipToContent'
import { fetchAPI, cleanImageUrl } from '@/lib/strapi'
import type {
  HeaderResponse,
  PageLink,
  PageCollectionResponse,
  Section,
  StrapiEntity,
} from '@/types/strapi'

type LayoutProps = {
  children: ReactNode
  locale: string
}

async function getHeaderData(locale: string) {
  // Validate locale to avoid API calls with invalid locales
  if (locale !== 'fr' && locale !== 'en' && locale !== 'it') {
    return null
  }

  try {
    // Faire deux requêtes distinctes (Strapi ne supporte pas toujours la population multiple
    // pour les components). On récupère les pages et on tente de récupérer les sections.
    // Si la seconde requête échoue (ex: validation error sur le populate), on continue
    // avec `dataSection = null` pour éviter de planter le rendu du header.
    const [pageResult, sectionResult] = await Promise.allSettled([
      fetchAPI<HeaderResponse>(
        '/header?populate[0]=navigation.page&populate[1]=logo',
        {
          locale,
          next: { revalidate: 3600 },
        }
      ),
      // This request can return 400 for some Strapi installations (invalid populate key).
      // We expect that and don't want a noisy warning in the console, so suppress it.
      fetchAPI<HeaderResponse>('/header?populate=navigation.section', {
        locale,
        next: { revalidate: 3600 },
        suppressWarnings: true,
      }),
    ])

    const respPage = pageResult.status === 'fulfilled' ? pageResult.value : null
    let respSection = null
    if (sectionResult.status === 'fulfilled') {
      respSection = sectionResult.value
    } else {
      // La récupération des sections a échoué (ex: populate non supporté).
      // On ignore proprement l'erreur et on continue sans données de sections.
    }

    const dataPage = respPage?.data || null
    const dataSection = respSection?.data || null

    if (!dataPage && !dataSection) return null

    // Merge navigation arrays using page id as key
    type NavItem = PageLink & { id?: number; section?: Section & StrapiEntity }
    const navMap = new Map<string, NavItem>()

    // Only process page navigation since PageLink only has page references now
    if (dataPage?.navigation) {
      for (const item of dataPage.navigation as NavItem[]) {
        if (item.page?.id) {
          navMap.set(`page-${item.page.id}`, { ...item })
        }
      }
    }

    if (dataSection?.navigation) {
      for (const item of dataSection.navigation as NavItem[]) {
        const pageId = item.page?.id
        if (pageId) {
          const existing = navMap.get(`page-${pageId}`) || {}
          navMap.set(`page-${pageId}`, { ...existing, ...item })
        } else {
          // Try to match by nav item id (preferred) or by page slug if available.
          let matchedKey: string | null = null

          // 1) Match by navigation component id (e.g., both respPage and respSection have same nav item id)
          for (const [key, val] of navMap.entries()) {
            if (val.id && val.id === item.id) {
              matchedKey = key
              break
            }
          }

          // 2) Fallback: match by page.slug
          if (!matchedKey) {
            const pageSlug = item.page?.slug
            if (pageSlug) {
              for (const [key, val] of navMap.entries()) {
                if (val.page?.slug === pageSlug) {
                  matchedKey = key
                  break
                }
              }
            }
          }

          if (matchedKey) {
            const existing = navMap.get(matchedKey) || {}
            navMap.set(matchedKey, { ...existing, ...item })
          } else {
            // keep as separate entry to avoid losing the section reference
            const extraKey = `extra-${navMap.size}-${Math.random().toString(36).slice(2, 7)}`
            navMap.set(extraKey, { ...item })
          }
        }
      }
    }

    const merged = Array.from(navMap.values())

    // If sections population failed, attempt a best-effort match by fetching the
    // target page sections and matching by label/title/identifier to recover anchors.
    const pageSectionsCache = new Map<string, (Section & StrapiEntity)[]>()

    const normalize = (s: string | undefined) =>
      (s || '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/gu, ' ')
        .trim()

    const tokens = (s: string | undefined) =>
      normalize(s).split(/\s+/).filter(Boolean)

    const findMatchingSection = async (
      pageSlug?: string,
      label?: string
    ): Promise<(Section & StrapiEntity) | null> => {
      if (!pageSlug || !label) return null
      if (!pageSectionsCache.has(pageSlug)) {
        try {
          const encoded = `filters%5Bslug%5D%5B%24eq%5D=${encodeURIComponent(pageSlug)}`
          const res = await fetchAPI<PageCollectionResponse>(
            `/pages?${encoded}&populate=sections`,
            { locale, next: { revalidate: 3600 } }
          )
          const p = res?.data?.[0]
          pageSectionsCache.set(pageSlug, p?.sections || [])
        } catch {
          pageSectionsCache.set(pageSlug, [])
        }
      }

      const secs = pageSectionsCache.get(pageSlug) || []
      if (!secs.length) return null

      const labelTokens = tokens(label)

      for (const sec of secs) {
        const secTitle = normalize(sec.title)
        const secIdentifier = normalize(sec.identifier)
        // Exact or substring matches
        if (
          labelTokens.some(
            (t) => secTitle.includes(t) || secIdentifier.includes(t)
          )
        )
          return sec
        // Prefix match (first 4 letters) to handle 'contact' vs 'contacter'
        if (
          labelTokens.some(
            (t) =>
              secTitle.split(/\s+/).some((s) => s.startsWith(t.slice(0, 4))) ||
              secIdentifier
                .split(/\s+/)
                .some((s) => s.startsWith(t.slice(0, 4)))
          )
        )
          return sec
      }

      return null
    }

    // Enrich merged navigation when section info is missing
    type NavItemWithSection = NavItem & { section?: Section & StrapiEntity }
    for (let i = 0; i < merged.length; i++) {
      const item: NavItemWithSection = merged[i]
      if (!item.section && item.page?.slug && (item.customLabel || '').trim()) {
        const matched = await findMatchingSection(
          item.page.slug,
          item.customLabel || item.page.title
        )
        if (matched) {
          merged[i] = { ...item, section: matched }
        }
      }
    }

    // Prefer dataPage root fields (logo/title), but attach merged navigation
    // Clean the logo URL so relative Strapi paths become absolute
    const logo = dataPage?.logo
      ? {
          ...dataPage.logo,
          url: cleanImageUrl(dataPage.logo.url) ?? dataPage.logo.url,
        }
      : dataPage?.logo
    return {
      ...dataPage,
      logo,
      navigation: merged,
    }
  } catch (error) {
    console.error('Erreur lors du chargement du header:', error)
    return null
  }
}

export const Layout = async ({ children, locale }: LayoutProps) => {
  const headerData = await getHeaderData(locale)

  // Ensure `variant` matches HeaderProps ('default' | 'stacked') —
  // Strapi types may be looser, so narrow at runtime for type safety.
  const headerVariant: 'default' | 'stacked' | undefined =
    headerData?.variant === 'stacked'
      ? 'stacked'
      : headerData?.variant === 'default'
        ? 'default'
        : undefined

  return (
    <div className="relative flex flex-col min-h-screen">
      <SkipToContent />
      <Header
        variant={headerVariant}
        logo={headerData?.logo}
        title={headerData?.title}
        navigation={headerData?.navigation}
        hideLanguageSwitcher={headerData?.hideLanguageSwitcher}
      />
      <main
        id="main-content"
        role="main"
        aria-label="Main content"
        className="flex-1"
      >
        {children}
      </main>
      <Footer siteName={headerData?.title} locale={locale} />
    </div>
  )
}
