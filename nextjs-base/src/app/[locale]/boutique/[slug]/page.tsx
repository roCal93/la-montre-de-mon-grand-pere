import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { formatPrice } from '@/lib/currency'
import { Layout } from '@/components/layout'
import BeforeAfterSlider from '@/components/media/BeforeAfterSlider'
import { AddToCartButton } from './AddToCartButton'
import { WishlistButton } from '@/components/espace-client/WishlistButton'
import ProductImageGallery from './ProductImageGallery'

interface StrapiImage {
  id: number
  url: string
  alternativeText: string | null
  width?: number | null
  height?: number | null
}

interface RelatedBlogArticle {
  id: number
  documentId: string
  title: string | null
  slug: string | null
  excerpt: string | null
  publicationDate: string | null
  createdAt?: string | null
  locale?: string | null
  coverImage: StrapiImage | null
}

interface PublicBadgeEntry {
  label: string | null
}

interface TechSpec {
  key: string
  val: string
}

interface ObservationConstatRow {
  observation: string
  constat: string | null
}

interface ComposantObservationRow {
  composant: string
  observations: string | null
}

interface GlobalConditionIndicator {
  pourcentage: number | null
  commentaire: string | null
}

interface GlobalConditionSummary {
  boitier: GlobalConditionIndicator | null
  cadran: GlobalConditionIndicator | null
  mouvement: GlobalConditionIndicator | null
  bracelet: GlobalConditionIndicator | null
}

interface EtatGeneral {
  etatGeneralGlobal: GlobalConditionSummary | null
  fonctionnementAvantIntervention: ObservationConstatRow[] | null
  etatVisuelComposants: ComposantObservationRow[] | null
}

interface GlobalConditionRow {
  key: 'boitier' | 'cadran' | 'mouvement' | 'bracelet'
  label: string
  percentage: number
  comment: string | null
}

interface RepairOperationLine {
  operation: string
  realisee: boolean | null
  observations: string | null
}

interface ReplacedPartLine {
  designationPiece: string | null
  referenceCalibre: string | null
  quantite: number | null
  origine: string | null
  etatPiece: 'orig' | 'rep' | null
}

interface OperationsReparation {
  operationsPubliques: string | null
  operationsEffectuees: RepairOperationLine[] | null
  piecesRemplacees: ReplacedPartLine[] | null
}

interface LigneReglagePosition {
  position: string | null
  rate: string | null
  amplitude: string | null
  beatError: string | null
  frequence: string | null
  resultat: string | null
}

interface LigneTestEtancheite {
  test: string | null
  valeurResultat: string | null
  observations: string | null
}

interface ControleQualiteMesures {
  marcheMoyennePublique: string | null
  etancheitePublique: string | null
  reglageEtPrecision: LigneReglagePosition[] | null
  testEtancheite: LigneTestEtancheite[] | null
  observationsConclusions: string | null
}

interface StrapiProduct {
  id: number
  documentId: string
  name: string
  slug: string
  price: number
  compareAtPrice: number | null
  active: boolean
  images: StrapiImage[] | null
  watchFile: {
    documentId: string
    marque: string | null
    referencePiece: string | null
    modele: string | null
    complications: string | null
    mouvement: string | null
    calibre: string | null
    anneeEstimee: string | null
    matiereBoitier: string | null
    diametreBoitier: string | null
    epaisseur: string | null
    matiereBracelet: string | null
    boucle: string | null
    verre: string | null
    etancheiteAnnoncee: string | null
    marketingShortDescription: string | null
    marketingDescription: string | null
    publicBadges: PublicBadgeEntry[] | null
    etatGeneral: EtatGeneral | null
    operationsReparation: OperationsReparation | null
    controleQualiteMesures: ControleQualiteMesures | null
    publicBeforeImage: StrapiImage[] | StrapiImage | null
    publicAfterImage: StrapiImage[] | StrapiImage | null
  } | null
  category: {
    id: number
    documentId: string
    name: string
    slug: string
  } | null
  relatedArticles: RelatedBlogArticle[] | null
}

type ProductBadge = { label: string; highlight?: boolean }

export function buildProductImageUrl(
  rawUrl: string,
  strapiUrl: string | undefined
) {
  return rawUrl.startsWith('http') ? rawUrl : `${strapiUrl}${rawUrl}`
}

export function buildProductBadges(
  badges: string[] | null,
  isSoldOut: boolean,
  locale: string
): ProductBadge[] {
  return [
    ...(badges ?? []).map((badge) => ({ label: badge })),
    ...(isSoldOut
      ? [{ label: locale === 'fr' ? 'Vendu' : 'Sold' }]
      : [
          {
            label: locale === 'fr' ? 'Stock unique' : 'Unique piece',
            highlight: true,
          },
        ]),
  ]
}

export function buildPublicBadgeLabels(
  badges: PublicBadgeEntry[] | null | undefined
) {
  return (badges ?? [])
    .map((badge) => badge.label?.trim() ?? '')
    .filter((badge) => badge.length > 0)
}

function formatBlogArticleDate(
  date: string | null | undefined,
  locale: string
) {
  if (!date) return null

  try {
    const parsedDate = new Date(date)
    if (Number.isNaN(parsedDate.getTime())) {
      return null
    }

    return parsedDate.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

export function buildBeforeAfterPairs(
  beforeImage: StrapiImage[] | StrapiImage | null,
  afterImage: StrapiImage[] | StrapiImage | null,
  strapiUrl: string | undefined
) {
  const beforeImages = Array.isArray(beforeImage)
    ? beforeImage
    : beforeImage
      ? [beforeImage]
      : []
  const afterImages = Array.isArray(afterImage)
    ? afterImage
    : afterImage
      ? [afterImage]
      : []

  return beforeImages.slice(0, afterImages.length).map((before, idx) => ({
    beforeUrl: buildProductImageUrl(before.url, strapiUrl),
    afterUrl: buildProductImageUrl(afterImages[idx].url, strapiUrl),
    beforeAlt: before.alternativeText ?? undefined,
    afterAlt: afterImages[idx].alternativeText ?? undefined,
    beforeWidth: before.width ?? undefined,
    beforeHeight: before.height ?? undefined,
    afterWidth: afterImages[idx].width ?? undefined,
    afterHeight: afterImages[idx].height ?? undefined,
  }))
}

function normalizeText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizePercentage(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return Math.max(0, Math.min(100, value))
}

export function buildGlobalConditionRows(
  etatGeneral: EtatGeneral | null,
  locale: string
) {
  const labels: Record<GlobalConditionRow['key'], string> = {
    boitier: locale === 'fr' ? 'Boîtier' : 'Case',
    cadran: locale === 'fr' ? 'Cadran' : 'Dial',
    mouvement: locale === 'fr' ? 'Mouvement' : 'Movement',
    bracelet: locale === 'fr' ? 'Bracelet' : 'Strap',
  }

  const globalState = etatGeneral?.etatGeneralGlobal
  if (!globalState) return []

  return (Object.keys(labels) as GlobalConditionRow['key'][])
    .map((key) => {
      const item = globalState[key]
      const percentage = normalizePercentage(item?.pourcentage)
      const comment = normalizeText(item?.commentaire)

      if (percentage === null && !comment) {
        return null
      }

      return {
        key,
        label: labels[key],
        percentage: percentage ?? 0,
        comment,
      }
    })
    .filter((row): row is GlobalConditionRow => row !== null)
}

export function buildPublicRepairSummary(summary: string | null | undefined) {
  return (summary ?? '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function buildProductSubtitle(
  watchFile: StrapiProduct['watchFile'],
  categoryName: string | null | undefined,
  locale: string
): string | null {
  const movement = watchFile?.mouvement?.trim() || null
  const diameter = watchFile?.diametreBoitier?.trim() || null

  const parts = [movement, diameter, categoryName ?? null].filter(
    (value): value is string => Boolean(value && value.trim())
  )

  if (parts.length > 0) {
    return parts.join(' • ')
  }

  if (watchFile?.marque?.trim()) return watchFile.marque
  return locale === 'fr' ? 'Pièce vintage révisée' : 'Restored vintage piece'
}

function buildProductTechnicalSpecs(
  watchFile: StrapiProduct['watchFile'],
  locale: string
): TechSpec[] {
  const specs = [
    {
      key: locale === 'fr' ? 'Complications' : 'Functions',
      val: watchFile?.complications?.trim() || null,
    },
    {
      key: locale === 'fr' ? 'Mouvement' : 'Movement',
      val: watchFile?.mouvement?.trim() || null,
    },
    {
      key: 'Calibre',
      val: watchFile?.calibre?.trim() || null,
    },
    {
      key: locale === 'fr' ? 'Année estimée' : 'Estimated year',
      val: watchFile?.anneeEstimee?.trim() || null,
    },
    {
      key: locale === 'fr' ? 'Boîtier' : 'Case material',
      val: watchFile?.matiereBoitier?.trim() || null,
    },
    {
      key: locale === 'fr' ? 'Diamètre' : 'Diameter',
      val: watchFile?.diametreBoitier?.trim() || null,
    },
    {
      key: locale === 'fr' ? 'Épaisseur' : 'Thickness',
      val: watchFile?.epaisseur?.trim() || null,
    },
    {
      key: locale === 'fr' ? 'Marche moyenne' : 'Average rate',
      val:
        watchFile?.controleQualiteMesures?.marcheMoyennePublique?.trim() ||
        null,
    },
    {
      key: locale === 'fr' ? 'Bracelet' : 'Strap material',
      val: watchFile?.matiereBracelet?.trim() || null,
    },
    {
      key: 'Boucle',
      val: watchFile?.boucle?.trim() || null,
    },
    {
      key: 'Verre',
      val: watchFile?.verre?.trim() || null,
    },
    {
      key: locale === 'fr' ? 'Étanchéité' : 'Water resistance',
      val:
        watchFile?.controleQualiteMesures?.etancheitePublique?.trim() ||
        watchFile?.etancheiteAnnoncee?.trim() ||
        null,
    },
  ]

  return specs.filter((spec): spec is TechSpec => Boolean(spec.val))
}

async function getProduct(
  slug: string,
  locale: string
): Promise<StrapiProduct | null> {
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL
  const token = process.env.STRAPI_API_TOKEN

  if (!strapiUrl) {
    console.error('[getProduct] NEXT_PUBLIC_STRAPI_URL is not configured')
    return null
  }

  const buildUrl = () => {
    const url = new URL(`${strapiUrl}/api/products`)
    url.searchParams.set('filters[slug][$eq]', slug)
    url.searchParams.set('locale', locale)
    url.searchParams.set('fields[0]', 'name')
    url.searchParams.set('fields[1]', 'slug')
    url.searchParams.set('fields[2]', 'price')
    url.searchParams.set('fields[3]', 'compareAtPrice')
    url.searchParams.set('fields[4]', 'active')
    url.searchParams.set('fields[5]', 'documentId')

    url.searchParams.set(
      'populate[watchFile][populate][publicBeforeImage][fields][0]',
      'url'
    )
    url.searchParams.set(
      'populate[watchFile][populate][publicBeforeImage][fields][1]',
      'alternativeText'
    )
    url.searchParams.set(
      'populate[watchFile][populate][publicAfterImage][fields][0]',
      'url'
    )
    url.searchParams.set(
      'populate[watchFile][populate][publicAfterImage][fields][1]',
      'alternativeText'
    )
    url.searchParams.set(
      'populate[watchFile][populate][operationsReparation]',
      'true'
    )
    url.searchParams.set('populate[watchFile][populate][publicBadges]', 'true')
    url.searchParams.set(
      'populate[watchFile][populate][controleQualiteMesures]',
      'true'
    )

    url.searchParams.set('populate[images][fields][0]', 'url')
    url.searchParams.set('populate[images][fields][1]', 'alternativeText')
    url.searchParams.set('populate[category][fields][0]', 'name')
    url.searchParams.set('populate[category][fields][1]', 'slug')
    url.searchParams.set('populate[relatedArticles][fields][0]', 'title')
    url.searchParams.set('populate[relatedArticles][fields][1]', 'slug')
    url.searchParams.set('populate[relatedArticles][fields][2]', 'excerpt')
    url.searchParams.set(
      'populate[relatedArticles][fields][3]',
      'publicationDate'
    )
    url.searchParams.set('populate[relatedArticles][fields][4]', 'createdAt')
    url.searchParams.set('populate[relatedArticles][fields][5]', 'locale')
    url.searchParams.set(
      'populate[relatedArticles][populate][coverImage][fields][0]',
      'url'
    )
    url.searchParams.set(
      'populate[relatedArticles][populate][coverImage][fields][1]',
      'alternativeText'
    )

    return url
  }

  const buildEtatGeneralGlobalUrl = () => {
    const url = new URL(`${strapiUrl}/api/products`)
    url.searchParams.set('filters[slug][$eq]', slug)
    url.searchParams.set('locale', locale)
    url.searchParams.set(
      'populate[watchFile][populate][etatGeneral][populate][0]',
      'etatGeneralGlobal'
    )
    url.searchParams.set(
      'populate[watchFile][populate][etatGeneral][populate][etatGeneralGlobal][populate][0]',
      'boitier'
    )
    url.searchParams.set(
      'populate[watchFile][populate][etatGeneral][populate][etatGeneralGlobal][populate][1]',
      'cadran'
    )
    url.searchParams.set(
      'populate[watchFile][populate][etatGeneral][populate][etatGeneralGlobal][populate][2]',
      'mouvement'
    )
    url.searchParams.set(
      'populate[watchFile][populate][etatGeneral][populate][etatGeneralGlobal][populate][3]',
      'bracelet'
    )

    return url
  }

  const url = buildUrl()

  try {
    const res = await fetch(url.toString(), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(
        `[getProduct] Strapi ${res.status} for slug="${slug}":`,
        body
      )
      return null
    }

    const json = (await res.json()) as { data: StrapiProduct[] }
    const product = json.data?.[0] ?? null

    if (!product?.watchFile?.documentId) {
      return product
    }

    try {
      const globalRes = await fetch(buildEtatGeneralGlobalUrl().toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      })

      if (!globalRes.ok) {
        const globalBody = await globalRes.text()
        console.error(
          `[getProduct:etatGeneralGlobal] Strapi ${globalRes.status} for slug="${slug}":`,
          globalBody
        )
        return product
      }

      const globalJson = (await globalRes.json()) as { data: StrapiProduct[] }
      const globalState =
        globalJson.data?.[0]?.watchFile?.etatGeneral?.etatGeneralGlobal ?? null

      if (globalState && product.watchFile) {
        return {
          ...product,
          watchFile: {
            ...product.watchFile,
            etatGeneral: {
              etatGeneralGlobal: globalState,
              fonctionnementAvantIntervention: null,
              etatVisuelComposants: null,
            },
          },
        }
      }
    } catch (etatError) {
      console.error('[getProduct:etatGeneralGlobal] fetch failed:', etatError)
    }

    return product
  } catch (error) {
    console.error(`[getProduct] fetch failed for slug="${slug}":`, error)
    return null
  }
}

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const product = await getProduct(slug, locale)
  if (!product) return {}
  const description =
    product.watchFile?.marketingShortDescription ??
    product.watchFile?.marketingDescription ??
    undefined
  return {
    title: product.name,
    description,
  }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 mt-8 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.15em] text-neutral-400">
      {children}
    </p>
  )
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params
  const product = await getProduct(slug, locale)
  if (!product) notFound()

  const isSoldOut = !product.active

  const { name, price, compareAtPrice, images, watchFile } = product

  const resolvedReference = watchFile?.referencePiece ?? null
  const resolvedShortDescription = watchFile?.marketingShortDescription ?? null
  const resolvedDescription = watchFile?.marketingDescription ?? null
  const resolvedBadges = buildPublicBadgeLabels(watchFile?.publicBadges)
  const resolvedTechnicalSpecs = buildProductTechnicalSpecs(watchFile, locale)
  const resolvedEtatGeneral = watchFile?.etatGeneral ?? null
  const publicRepairSummary = buildPublicRepairSummary(
    watchFile?.operationsReparation?.operationsPubliques ?? null
  )
  const resolvedBeforeImage = watchFile?.publicBeforeImage ?? null
  const resolvedAfterImage = watchFile?.publicAfterImage ?? null

  const galleryImages = (images ?? []).map((img) => ({
    id: img.id,
    url: buildProductImageUrl(img.url, process.env.NEXT_PUBLIC_STRAPI_URL),
    alternativeText: img.alternativeText,
  }))
  const firstImgUrl = galleryImages[0]?.url ?? null

  const productSubtitle = buildProductSubtitle(
    watchFile,
    product.category?.name,
    locale
  )

  const shopPath = locale === 'fr' ? 'boutique' : 'shop'
  const publicDossierHref = watchFile?.documentId
    ? `/${locale}/dossier/${watchFile.documentId}`
    : null

  const hasSpecs = resolvedTechnicalSpecs.length > 0
  const globalConditionRows = buildGlobalConditionRows(
    resolvedEtatGeneral,
    locale
  )
  const hasEtatGeneral = globalConditionRows.length > 0
  const hasRestoration = publicRepairSummary.length > 0
  const beforeAfterPairs = buildBeforeAfterPairs(
    resolvedBeforeImage,
    resolvedAfterImage,
    process.env.NEXT_PUBLIC_STRAPI_URL
  )
  const hasSlider = beforeAfterPairs.length > 0

  const allBadges = buildProductBadges(resolvedBadges, isSoldOut, locale)
  const relatedArticles = (product.relatedArticles ?? []).filter(
    (article): article is RelatedBlogArticle =>
      Boolean(article.slug && article.title) &&
      (!article.locale || article.locale === locale)
  )

  return (
    <Layout locale={locale}>
      <main className="mx-auto max-w-5xl mb-10 px-4 py-10 sm:px-6 lg:px-8">
        {/* Back */}
        <Link
          href={`/${locale}/${shopPath}`}
          className="mb-8 inline-flex items-center font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.1em] text-neutral-400 transition-colors hover:text-black dark:hover:text-white"
        >
          ← {locale === 'fr' ? 'Retour à la boutique' : 'Back to shop'}
        </Link>

        {/* ── Header : galerie + meta ── */}
        <div className="grid grid-cols-1 gap-10 border-b border-neutral-200 pb-10 md:grid-cols-[minmax(0,_1.15fr)_minmax(0,_0.85fr)]">
          <div className="mx-auto w-full max-w-[32rem] md:max-w-none">
            <ProductImageGallery images={galleryImages} name={name} />
          </div>

          <div className="flex flex-col">
            <div className="flex flex-col gap-1">
              {resolvedReference && (
                <p className="font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.08em] text-neutral-400">
                  REF — {resolvedReference}
                </p>
              )}
              <h1 className="text-[23px] font-medium leading-snug">{name}</h1>
              {productSubtitle && (
                <p className="font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.12em] text-neutral-500">
                  {productSubtitle}
                </p>
              )}
            </div>

            {resolvedShortDescription && (
              <div className="my-6 md:mb-8 md:mt-6 lg:my-auto">
                <p className="mb-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.15em] text-neutral-400">
                  {locale === 'fr' ? 'À propos' : 'About'}
                </p>
                <p className="border-l-2 border-black pl-4 text-[14px] leading-[1.8] text-neutral-500">
                  {resolvedShortDescription}
                </p>
              </div>
            )}

            <div className="mt-2 flex flex-col gap-5 md:mt-6">
              {/* Prix */}
              <div className="flex items-baseline gap-3">
                <span className="font-[family-name:var(--font-geist-mono)] text-[29px] font-light">
                  {formatPrice(price)}
                </span>
                {compareAtPrice && compareAtPrice > price && (
                  <span className="font-[family-name:var(--font-geist-mono)] text-sm text-neutral-400 line-through">
                    {formatPrice(compareAtPrice)}
                  </span>
                )}
              </div>

              {/* Badges */}
              {allBadges.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {allBadges.map((b, idx) => (
                    <span
                      key={`${b.label}-${idx}`}
                      className={`border px-[10px] py-[4px] font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] ${
                        b.highlight
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                          : 'border-neutral-300 text-neutral-500'
                      }`}
                    >
                      {b.label}
                    </span>
                  ))}
                </div>
              )}

              {/* CTA */}
              <div className="flex flex-col gap-3">
                {isSoldOut ? (
                  <div className="w-full border border-neutral-200 bg-neutral-200 px-6 py-3 text-center font-[family-name:var(--font-geist-mono)] text-[13px] uppercase tracking-[0.1em] text-neutral-600">
                    {locale === 'fr'
                      ? 'Cette pièce a trouvé son propriétaire'
                      : 'This product is sold'}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <AddToCartButton
                      product={{
                        id: product.id,
                        documentId: product.documentId,
                        name,
                        slug,
                        price,
                        imageUrl: firstImgUrl,
                        description:
                          resolvedShortDescription ??
                          resolvedDescription ??
                          null,
                      }}
                    />
                    <WishlistButton
                      productDocumentId={product.documentId}
                      productId={product.id}
                    />
                  </div>
                )}

                {publicDossierHref ? (
                  <Link
                    href={publicDossierHref}
                    className="inline-flex w-full items-center justify-center rounded-md border border-neutral-300 bg-white px-6 py-3 text-center font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.1em] text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
                  >
                    {locale === 'fr'
                      ? 'Decouvrir le dossier de la montre'
                      : 'Discover the watch dossier'}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* ── Avant / Après ── */}
        {hasSlider && (
          <div className="mt-8">
            <SectionLabel>
              {locale === 'fr'
                ? 'Avant / Après réparation'
                : 'Before / After restoration'}
            </SectionLabel>
            <BeforeAfterSlider pairs={beforeAfterPairs} locale={locale} />
          </div>
        )}

        {/* ── Spécifications techniques ── */}
        {hasSpecs && (
          <div className="mt-8">
            <SectionLabel>
              {locale === 'fr'
                ? 'Spécifications techniques'
                : 'Technical specifications'}
            </SectionLabel>
            <div className="border border-neutral-200 divide-y divide-neutral-200 dark:border-neutral-700 dark:divide-neutral-700">
              {Array.from(
                { length: Math.ceil(resolvedTechnicalSpecs.length / 2) },
                (_, rowIndex) => {
                  const left = resolvedTechnicalSpecs[rowIndex * 2]
                  const right = resolvedTechnicalSpecs[rowIndex * 2 + 1]
                  return (
                    <div
                      key={rowIndex}
                      className={`grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200 dark:divide-neutral-700 ${
                        rowIndex % 2 === 0
                          ? 'bg-neutral-50 dark:bg-neutral-800/50'
                          : 'bg-white dark:bg-neutral-900'
                      }`}
                    >
                      <div className="flex items-baseline justify-between px-4 py-2.5 text-[14px]">
                        <span className="font-[family-name:var(--font-geist-mono)] text-[12px] text-neutral-400 dark:text-neutral-500">
                          {left.key}
                        </span>
                        <span className="font-medium dark:text-neutral-100">
                          {left.val}
                        </span>
                      </div>
                      {right ? (
                        <div className="flex items-baseline justify-between px-4 py-2.5 text-[14px]">
                          <span className="font-[family-name:var(--font-geist-mono)] text-[12px] text-neutral-400 dark:text-neutral-500">
                            {right.key}
                          </span>
                          <span className="font-medium dark:text-neutral-100">
                            {right.val}
                          </span>
                        </div>
                      ) : (
                        <div />
                      )}
                    </div>
                  )
                }
              )}
            </div>
          </div>
        )}

        {/* ── État général ── */}
        {hasEtatGeneral && (
          <div className="mt-8">
            <SectionLabel>
              {locale === 'fr' ? 'État général' : 'General condition'}
            </SectionLabel>
            <div className="flex flex-col gap-6">
              {globalConditionRows.map((row) => (
                <div key={row.key} className="flex items-center gap-4">
                  <span className="w-24 shrink-0 font-[family-name:var(--font-geist-mono)] text-[12px] leading-[1.5] text-neutral-400 sm:w-28">
                    {row.label}
                  </span>
                  <div className="h-[3px] min-w-0 flex-1 bg-neutral-100">
                    <div
                      className="h-full bg-black"
                      style={{ width: `${row.percentage}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right font-[family-name:var(--font-geist-mono)] text-[12px] leading-[1.5] text-neutral-700 sm:w-28">
                    {row.comment ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Travaux de réparation ── */}
        {hasRestoration && (
          <div className="mt-8">
            <SectionLabel>
              {locale === 'fr' ? 'Travaux de réparation' : 'Repair work'}
            </SectionLabel>
            <div className="border border-neutral-200 p-5">
              <p className="mb-4 font-[family-name:var(--font-geist-mono)] text-[12px] text-neutral-400">
                {locale === 'fr'
                  ? "Effectués par l'horloger restaurateur — inclus dans le prix"
                  : 'Performed by the watchmaker — included in the price'}
              </p>
              <ul className="flex flex-col gap-2">
                {publicRepairSummary.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[14px]">
                    <span className="h-[6px] w-[6px] flex-shrink-0 bg-black" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── Histoire ── */}
        {resolvedDescription && (
          <div className="mt-8">
            <SectionLabel>
              {locale === 'fr' ? 'Histoire' : 'History'}
            </SectionLabel>
            <div
              className="border-l-2 border-black pl-4 text-[14px] leading-[1.8] text-neutral-500 [&_p]:mb-3 [&_p:last-child]:mb-0"
              dangerouslySetInnerHTML={{ __html: resolvedDescription }}
            />
          </div>
        )}

        {relatedArticles.length > 0 ? (
          <div className="mt-10">
            <SectionLabel>
              {locale === 'fr' ? 'Autour de cette pièce' : 'Further reading'}
            </SectionLabel>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {relatedArticles.slice(0, 3).map((article) => {
                const coverImageUrl = article.coverImage?.url
                  ? buildProductImageUrl(
                      article.coverImage.url,
                      process.env.NEXT_PUBLIC_STRAPI_URL
                    )
                  : null
                const articleDate = formatBlogArticleDate(
                  article.publicationDate || article.createdAt,
                  locale
                )

                return (
                  <Link
                    key={article.documentId}
                    href={`/${locale}/blog/${article.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-transform duration-300 hover:-translate-y-1"
                  >
                    {coverImageUrl ? (
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
                        <Image
                          src={coverImageUrl}
                          alt={
                            article.coverImage?.alternativeText ||
                            article.title ||
                            'Blog article cover image'
                          }
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      </div>
                    ) : null}
                    <div className="flex flex-1 flex-col gap-3 p-5">
                      {articleDate ? (
                        <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-400">
                          {articleDate}
                        </span>
                      ) : null}
                      <h2 className="text-[19px] font-medium leading-snug text-neutral-900 transition-colors group-hover:text-neutral-600">
                        {article.title}
                      </h2>
                      {article.excerpt ? (
                        <p className="border-l-2 border-black pl-4 text-[14px] leading-[1.75] text-neutral-500">
                          {article.excerpt}
                        </p>
                      ) : null}
                      <span className="mt-auto font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-500">
                        {locale === 'fr' ? "Lire l'article" : 'Read article'}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* ── Footer strip ── */}
        <div className="mt-12 grid grid-cols-4 divide-x divide-neutral-200 border-t border-neutral-200 pt-6">
          {[
            {
              val: '12 mois',
              key: locale === 'fr' ? 'Garantie' : 'Warranty',
              href: `/${locale}/garantie`,
            },
            {
              val: '48 h',
              key: locale === 'fr' ? 'Expédition' : 'Shipping',
              href: `/${locale}/livraison`,
            },
            {
              val: '14 jours',
              key: locale === 'fr' ? 'Retour' : 'Return',
              href: `/${locale}/livraison`,
            },
            {
              val: locale === 'fr' ? 'Sécurisé' : 'Secure',
              key: locale === 'fr' ? 'Paiement' : 'Payment',
              href:
                locale === 'fr'
                  ? 'https://stripe.com/fr/security'
                  : 'https://stripe.com/security',
            },
          ].map(({ val, key, href }) =>
            href ? (
              <Link
                key={key}
                href={href}
                {...(href.startsWith('http')
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
                className="flex flex-col items-center gap-1 px-2 text-center transition-opacity hover:opacity-60"
              >
                <span className="font-[family-name:var(--font-geist-mono)] text-[14px] font-medium">
                  {val}
                </span>
                <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-400">
                  {key}
                </span>
              </Link>
            ) : (
              <div
                key={key}
                className="flex flex-col items-center gap-1 px-2 text-center"
              >
                <span className="font-[family-name:var(--font-geist-mono)] text-[14px] font-medium">
                  {val}
                </span>
                <span className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-400">
                  {key}
                </span>
              </div>
            )
          )}
        </div>
      </main>
    </Layout>
  )
}
