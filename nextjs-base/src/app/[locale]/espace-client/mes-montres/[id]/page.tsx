import { getCurrentStrapiUser } from '@/lib/strapi-session-cookie'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { strapiAuthGet } from '@/lib/strapi-auth-client'
import Link from 'next/link'
import Image from 'next/image'
import { cleanImageUrl } from '@/lib/strapi'
import WatchFileDossierBlocks from '@/components/espace-client/watch-file/WatchFileDossierBlocks'
import {
  appendWatchFileDossierBlocksPopulate,
  filterRenderableWatchFileDossierBlocks,
  type WatchFileDossierBlock,
} from '@/lib/watch-file-dossier-blocks'

interface MediaFile {
  url: string
  alternativeText?: string
  width?: number
  height?: number
}

interface PublicBadgeEntry {
  label?: string | null
}

interface EtatGeneralIndicator {
  pourcentage?: number | null
  commentaire?: string | null
}

interface EtatGeneral {
  etatGeneralGlobal?: {
    boitier?: EtatGeneralIndicator | null
    cadran?: EtatGeneralIndicator | null
    mouvement?: EtatGeneralIndicator | null
    bracelet?: EtatGeneralIndicator | null
  } | null
  fonctionnementAvantIntervention?: Array<{
    observation?: string | null
    constat?: string | null
  }> | null
  etatVisuelComposants?: Array<{
    composant?: string | null
    observations?: string | null
  }> | null
}

interface OperationsReparation {
  operationsPubliques?: string | null
  operationsEffectuees?: Array<{
    operation?: string | null
    realisee?: boolean | null
    observations?: string | null
  }> | null
  piecesRemplacees?: Array<{
    designationPiece?: string | null
    referenceCalibre?: string | null
    quantite?: number | null
    origine?: string | null
    etatPiece?: 'orig' | 'rep' | null
  }> | null
}

interface ControleQualiteMesures {
  marcheMoyennePublique?: string | null
  etancheitePublique?: string | null
  reglageEtPrecision?: Array<{
    position?: string | null
    rate?: string | null
    amplitude?: string | null
    beatError?: string | null
    frequence?: string | null
    resultat?: string | null
  }> | null
  testEtancheite?: Array<{
    test?: string | null
    valeurResultat?: string | null
    observations?: string | null
  }> | null
  observationsConclusions?: string | null
}

interface ValidationAtelier {
  dateFin?: string | null
  dureeIntervention?: string | null
  signature?: MediaFile | null
  dateSignature?: string | null
}

interface WatchFile {
  documentId: string
  reference: string
  marque?: string | null
  referencePiece?: string | null
  modele?: string | null
  complications?: string | null
  mouvement?: string | null
  calibre?: string | null
  anneeEstimee?: string | null
  matiereBoitier?: string | null
  diametreBoitier?: string | null
  epaisseur?: string | null
  matiereBracelet?: string | null
  boucle?: string | null
  verre?: string | null
  etancheiteAnnoncee?: string | null
  marketingShortDescription?: string | null
  marketingDescription?: string | null
  notesIdentification?: string | null
  publicBadges?: PublicBadgeEntry[] | null
  etatGeneral?: EtatGeneral | null
  operationsReparation?: OperationsReparation | null
  controleQualiteMesures?: ControleQualiteMesures | null
  validationAtelier?: ValidationAtelier | null
  dossierBlocks?: WatchFileDossierBlock[] | null
  createdAt: string
  updatedAt: string
  dateReception?: string
  dateMiseEnVente?: string
  order?: { documentId: string; total: number; createdAt: string }
  product?: {
    name: string
    slug: string
    images?: MediaFile[] | null
  }
  customer?: { id: number }
}

interface StrapiSingle<T> {
  data: T
}

function formatLongDate(value?: string) {
  if (!value) return 'Non renseignée'

  return new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function normalizeText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizePercentage(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return Math.max(0, Math.min(100, value))
}

function buildGlobalRows(etatGeneral?: EtatGeneral | null) {
  const globalState = etatGeneral?.etatGeneralGlobal
  if (!globalState) return []

  return [
    { label: 'Boîtier', item: globalState.boitier },
    { label: 'Cadran', item: globalState.cadran },
    { label: 'Mouvement', item: globalState.mouvement },
    { label: 'Bracelet', item: globalState.bracelet },
  ]
    .map(({ label, item }) => {
      const percentage = normalizePercentage(item?.pourcentage)
      const comment = normalizeText(item?.commentaire)

      if (percentage === null && !comment) return null

      return { label, percentage: percentage ?? 0, comment }
    })
    .filter(
      (
        row
      ): row is { label: string; percentage: number; comment: string | null } =>
        row !== null
    )
}

function buildObservationRows(etatGeneral?: EtatGeneral | null) {
  return (etatGeneral?.fonctionnementAvantIntervention ?? []).filter(
    (row) => normalizeText(row.observation) || normalizeText(row.constat)
  )
}

function buildComponentRows(etatGeneral?: EtatGeneral | null) {
  return (etatGeneral?.etatVisuelComposants ?? []).filter(
    (row) => normalizeText(row.composant) || normalizeText(row.observations)
  )
}

function buildPublicOperationsSummary(
  operationsReparation?: OperationsReparation | null
) {
  return (operationsReparation?.operationsPubliques ?? '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function buildRepairOperationRows(
  operationsReparation?: OperationsReparation | null
) {
  return (operationsReparation?.operationsEffectuees ?? []).filter(
    (row) =>
      normalizeText(row.operation) ||
      typeof row.realisee === 'boolean' ||
      normalizeText(row.observations)
  )
}

function buildReplacedPartRows(
  operationsReparation?: OperationsReparation | null
) {
  return (operationsReparation?.piecesRemplacees ?? []).filter(
    (row) =>
      normalizeText(row.designationPiece) ||
      normalizeText(row.referenceCalibre) ||
      row.quantite ||
      normalizeText(row.origine) ||
      row.etatPiece
  )
}

function buildTimingRows(
  controleQualiteMesures?: ControleQualiteMesures | null
) {
  return (controleQualiteMesures?.reglageEtPrecision ?? []).filter(
    (row) =>
      normalizeText(row.position) ||
      normalizeText(row.rate) ||
      normalizeText(row.amplitude) ||
      normalizeText(row.beatError) ||
      normalizeText(row.frequence) ||
      normalizeText(row.resultat)
  )
}

function buildWaterResistanceRows(
  controleQualiteMesures?: ControleQualiteMesures | null
) {
  return (controleQualiteMesures?.testEtancheite ?? []).filter(
    (row) =>
      normalizeText(row.test) ||
      normalizeText(row.valeurResultat) ||
      normalizeText(row.observations)
  )
}

function buildPublicBadgeLabels(badges?: PublicBadgeEntry[] | null) {
  return (badges ?? [])
    .map((badge) => normalizeText(badge.label) ?? '')
    .filter((badge) => badge.length > 0)
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.15em] text-neutral-600 dark:text-neutral-300">
      {children}
    </p>
  )
}

function DossierSection({
  index,
  title,
  children,
}: {
  index: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-10">
      <SectionLabel>
        {index}. {title}
      </SectionLabel>
      <div className="rounded-2xl border border-neutral-300 bg-white p-4 shadow-sm shadow-black/5 dark:border-neutral-600 dark:bg-neutral-900 sm:p-6">
        {children}
      </div>
    </section>
  )
}

function DossierTableFrame({
  children,
  minWidth = '42rem',
}: {
  children: React.ReactNode
  minWidth?: string
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-50/70 shadow-sm shadow-black/5 dark:border-neutral-700 dark:bg-neutral-900/60">
      <div style={{ minWidth }}>{children}</div>
    </div>
  )
}

function DossierFactGrid({
  items,
}: {
  items: Array<{ key: string; label: string; value: React.ReactNode }>
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.key}
          className="rounded-xl border border-neutral-200 bg-neutral-50/80 px-4 py-4 dark:border-neutral-700 dark:bg-neutral-800/40"
        >
          <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
            {item.label}
          </p>
          <div className="mt-2 text-[15px] leading-[1.65] text-neutral-900 dark:text-neutral-100">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}

function DossierMobileRecords({
  records,
}: {
  records: Array<{
    key: string
    title: React.ReactNode
    fields: Array<{ label: string; value: React.ReactNode }>
  }>
}) {
  return (
    <div className="grid gap-3 md:hidden">
      {records.map((record) => (
        <div
          key={record.key}
          className="rounded-xl border border-neutral-200 bg-neutral-50/80 px-4 py-4 dark:border-neutral-700 dark:bg-neutral-800/40"
        >
          <p className="text-[15px] font-medium leading-[1.5] text-neutral-900 dark:text-neutral-100">
            {record.title}
          </p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {record.fields.map((field) => (
              <div key={`${record.key}-${field.label}`}>
                <dt className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
                  {field.label}
                </dt>
                <dd className="mt-1 text-sm leading-[1.6] text-neutral-700 dark:text-neutral-200">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}

function buildIdentificationRows(watchFile: WatchFile) {
  return [
    [
      'Marque',
      normalizeText(watchFile.marque) ?? '—',
      'Modèle',
      normalizeText(watchFile.modele ?? watchFile.product?.name) ?? '—',
    ],
    [
      'Référence',
      normalizeText(watchFile.referencePiece) ?? '—',
      'Complications',
      normalizeText(watchFile.complications) ?? '—',
    ],
    [
      'Mouvement',
      normalizeText(watchFile.mouvement) ?? '—',
      'Calibre',
      normalizeText(watchFile.calibre) ?? '—',
    ],
    [
      'Année estimée',
      normalizeText(watchFile.anneeEstimee) ?? '—',
      'Matière du boîtier',
      normalizeText(watchFile.matiereBoitier) ?? '—',
    ],
    [
      'Diamètre boîtier',
      normalizeText(watchFile.diametreBoitier) ?? '—',
      'Épaisseur',
      normalizeText(watchFile.epaisseur) ?? '—',
    ],
    [
      'Bracelet / matière',
      normalizeText(watchFile.matiereBracelet) ?? '—',
      'Boucle',
      normalizeText(watchFile.boucle) ?? '—',
    ],
    [
      'Verre',
      normalizeText(watchFile.verre) ?? '—',
      'Étanchéité annoncée',
      normalizeText(watchFile.etancheiteAnnoncee) ?? '—',
    ],
  ] as const
}

export default async function WatchFileDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const strapiUser = await getCurrentStrapiUser()

  if (!strapiUser) redirect(`/${locale}/espace-client/connexion`)

  const query = new URLSearchParams()
  query.set('populate[publicBadges]', 'true')
  query.set('populate[order]', 'true')
  query.set('populate[product][populate][images][fields][0]', 'url')
  query.set('populate[product][populate][images][fields][1]', 'alternativeText')
  query.set('populate[customer]', 'true')
  query.set('populate[etatGeneral][populate][0]', 'etatGeneralGlobal')
  query.set(
    'populate[etatGeneral][populate][1]',
    'fonctionnementAvantIntervention'
  )
  query.set('populate[etatGeneral][populate][2]', 'etatVisuelComposants')
  query.set(
    'populate[operationsReparation][populate][0]',
    'operationsEffectuees'
  )
  query.set('populate[operationsReparation][populate][1]', 'piecesRemplacees')
  query.set(
    'populate[controleQualiteMesures][populate][0]',
    'reglageEtPrecision'
  )
  query.set('populate[controleQualiteMesures][populate][1]', 'testEtancheite')
  query.set('populate[validationAtelier][populate][0]', 'signature')

  // dossierBlocks are fetched in a separate query so that a populate error
  // (e.g. during schema migration) never brings down the entire page.
  const dossierQuery = new URLSearchParams()
  appendWatchFileDossierBlocksPopulate(dossierQuery)

  const [{ data, error }, dossierResponse] = await Promise.all([
    strapiAuthGet<StrapiSingle<WatchFile>>(
      `/watch-files/${id}?${query.toString()}`,
      0
    ),
    strapiAuthGet<StrapiSingle<WatchFile>>(
      `/watch-files/${id}?${dossierQuery.toString()}`,
      0
    ),
  ])

  const watchFile = data?.data
  if (!watchFile || error) notFound()
  if (watchFile.customer?.id !== strapiUser.id) notFound()

  let rawDossierBlocks = dossierResponse.data?.data?.dossierBlocks ?? []

  if (rawDossierBlocks.length === 0) {
    const dossierFallbackQuery = new URLSearchParams()
    dossierFallbackQuery.set('populate[dossierBlocks]', 'true')

    const { data: dossierFallbackData } = await strapiAuthGet<
      StrapiSingle<WatchFile>
    >(`/watch-files/${id}?${dossierFallbackQuery.toString()}`, 0)

    rawDossierBlocks = dossierFallbackData?.data?.dossierBlocks ?? []
  }

  const dossierBlocks = filterRenderableWatchFileDossierBlocks(rawDossierBlocks)
  const globalRows = buildGlobalRows(watchFile.etatGeneral)
  const observationRows = buildObservationRows(watchFile.etatGeneral)
  const componentRows = buildComponentRows(watchFile.etatGeneral)
  const publicOperationsSummary = buildPublicOperationsSummary(
    watchFile.operationsReparation
  )
  const repairOperationRows = buildRepairOperationRows(
    watchFile.operationsReparation
  )
  const replacedPartRows = buildReplacedPartRows(watchFile.operationsReparation)
  const timingRows = buildTimingRows(watchFile.controleQualiteMesures)
  const waterResistanceRows = buildWaterResistanceRows(
    watchFile.controleQualiteMesures
  )
  const qualityNotes = normalizeText(
    watchFile.controleQualiteMesures?.observationsConclusions
  )
  const publicBadgeLabels = buildPublicBadgeLabels(watchFile.publicBadges)
  const identificationRows = buildIdentificationRows(watchFile)
  const identificationNotes =
    normalizeText(
      watchFile.notesIdentification ?? watchFile.marketingShortDescription
    ) ?? 'Non renseignées'
  const publicSummary = normalizeText(watchFile.marketingShortDescription)
  const publicHistory = normalizeText(watchFile.marketingDescription)
  const productHeroImage = watchFile.product?.images?.[0] ?? null
  const productHeroImageUrl = cleanImageUrl(productHeroImage?.url)
  const validationAtelier = watchFile.validationAtelier ?? null
  const hasValidationAtelier =
    normalizeText(validationAtelier?.dureeIntervention) ||
    validationAtelier?.signature?.url ||
    validationAtelier?.dateFin ||
    validationAtelier?.dateSignature

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={`/${locale}/espace-client/mes-montres`}
          className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.1em] text-neutral-600 transition-colors hover:text-black dark:text-neutral-300 dark:hover:text-white"
        >
          ← Mes montres
        </Link>
      </div>

      <div className="border-b border-neutral-300 pb-8 dark:border-neutral-600 sm:pb-10">
        <div
          className={`grid gap-8 ${productHeroImageUrl ? 'lg:grid-cols-[minmax(0,_1fr)_22rem]' : 'md:grid-cols-[minmax(0,_1fr)_auto]'} md:items-start lg:gap-10`}
        >
          <div className="pt-1">
            <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.14em] text-neutral-600 dark:text-neutral-300">
              Dossier montre
            </p>
            <h1 className="mt-3 text-[23px] font-medium leading-snug text-neutral-900 dark:text-white sm:text-[26px]">
              {watchFile.product?.name ?? `Dossier ${watchFile.reference}`}
            </h1>
            <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.12em] text-neutral-700 dark:text-neutral-200">
              REF — {watchFile.reference}
            </p>

            {publicSummary && (
              <div className="my-6 max-w-3xl sm:my-7">
                <p className="mb-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.15em] text-neutral-600 dark:text-neutral-300">
                  Résumé
                </p>
                <p className="text-[14px] leading-[1.8] text-neutral-700 dark:text-neutral-200">
                  {publicSummary}
                </p>
              </div>
            )}

            {publicBadgeLabels.length > 0 && (
              <div className="flex flex-wrap gap-2.5 sm:gap-3">
                {publicBadgeLabels.map((badge, index) => (
                  <span
                    key={`${badge}-${index}`}
                    className="border border-neutral-400 bg-neutral-100 px-[10px] py-[4px] font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 sm:mt-7">
              <Link
                href={`/api/watch-files/${watchFile.documentId}/pdf`}
                className="inline-flex items-center justify-center self-start rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-[13px] font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.08em] text-white shadow-sm shadow-black/10 transition-colors hover:bg-neutral-700 dark:border-neutral-200 dark:bg-neutral-100 dark:text-black dark:hover:bg-white"
              >
                Télécharger le dossier PDF
              </Link>
            </div>
          </div>

          {productHeroImageUrl ? (
            <div className="overflow-hidden rounded-[1.5rem] border border-neutral-300 bg-neutral-100 shadow-sm shadow-black/5 dark:border-neutral-600 dark:bg-neutral-800 lg:mt-1">
              <Image
                src={productHeroImageUrl}
                alt={
                  productHeroImage?.alternativeText ??
                  watchFile.product?.name ??
                  'Photo de la montre'
                }
                width={800}
                height={800}
                className="aspect-square h-full w-full object-cover"
              />
            </div>
          ) : null}
        </div>
      </div>

      {publicHistory && (
        <DossierSection index="1" title="Histoire">
          <div
            className="text-[14px] leading-[1.8] text-neutral-700 dark:text-neutral-200 [&_p]:mb-3 [&_p:last-child]:mb-0"
            dangerouslySetInnerHTML={{ __html: publicHistory }}
          />
        </DossierSection>
      )}

      <DossierSection index="2" title="Informations dossier">
        <DossierFactGrid
          items={[
            {
              key: 'watch-file-reference',
              label: 'Référence dossier',
              value: watchFile.reference,
            },
            {
              key: 'watchmaker',
              label: 'Horloger responsable',
              value: 'Romain Calmelet',
            },
            {
              key: 'received-at',
              label: 'Date de réception',
              value: formatLongDate(watchFile.dateReception),
            },
            {
              key: 'listed-at',
              label: 'Date de mise en vente',
              value: formatLongDate(watchFile.dateMiseEnVente),
            },
          ]}
        />
      </DossierSection>

      <DossierSection index="3" title="Identification de la montre">
        <div className="grid gap-3 md:hidden sm:grid-cols-2">
          {identificationRows
            .flatMap((row) => [
              {
                key: `${row[0]}-${row[2]}-left`,
                label: row[0],
                value: row[1],
              },
              {
                key: `${row[0]}-${row[2]}-right`,
                label: row[2],
                value: row[3],
              },
            ])
            .map((item) => (
              <div
                key={item.key}
                className="rounded-xl border border-neutral-200 bg-neutral-50/80 px-4 py-4 dark:border-neutral-700 dark:bg-neutral-800/40"
              >
                <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
                  {item.label}
                </p>
                <p className="mt-2 text-[15px] leading-[1.65] text-neutral-900 dark:text-neutral-100">
                  {item.value}
                </p>
              </div>
            ))}
        </div>

        <div className="hidden md:block">
          <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
            {identificationRows.map((row, index) => (
              <div
                key={row[0]}
                className={`grid grid-cols-[minmax(0,_0.24fr)_minmax(0,_0.26fr)_minmax(0,_0.24fr)_minmax(0,_0.26fr)] border-t border-neutral-200 dark:border-neutral-700 ${index === 0 ? 'border-t-0' : ''} ${index % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-neutral-50 dark:bg-neutral-800/50'}`}
              >
                <div className="border-r border-neutral-200 px-4 py-2 dark:border-neutral-700">
                  <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-600 dark:text-neutral-300">
                    {row[0]}
                  </p>
                </div>
                <div className="border-r border-neutral-200 px-4 py-2 dark:border-neutral-700">
                  <p className="text-sm text-neutral-700 dark:text-neutral-200">
                    {row[1]}
                  </p>
                </div>
                <div className="border-r border-neutral-200 px-4 py-2 dark:border-neutral-700">
                  <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-600 dark:text-neutral-300">
                    {row[2]}
                  </p>
                </div>
                <div className="px-4 py-2">
                  <p className="text-sm text-neutral-700 dark:text-neutral-200">
                    {row[3]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
          <SectionLabel>3.2 Notes d&apos;identification</SectionLabel>
          <p className="text-sm leading-[1.7] text-neutral-700 dark:text-neutral-200">
            {identificationNotes}
          </p>
        </div>
      </DossierSection>

      {(globalRows.length > 0 ||
        observationRows.length > 0 ||
        componentRows.length > 0) && (
        <DossierSection index="4" title="État à la réception">
          {globalRows.length > 0 && (
            <div>
              <SectionLabel>4.0 Résumé global fiche produit</SectionLabel>
              <div className="flex flex-col gap-6">
                {globalRows.map((row) => (
                  <div key={row.label} className="flex items-center gap-4">
                    <span className="w-24 shrink-0 font-[family-name:var(--font-geist-mono)] text-[12px] leading-[1.5] text-neutral-600 dark:text-neutral-300 sm:w-28">
                      {row.label}
                    </span>
                    <div className="h-[3px] min-w-0 flex-1 bg-neutral-100 dark:bg-neutral-700">
                      <div
                        className="h-full bg-black dark:bg-white"
                        style={{ width: `${row.percentage}%` }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right font-[family-name:var(--font-geist-mono)] text-[12px] leading-[1.5] text-neutral-700 dark:text-neutral-200 sm:w-28">
                      {row.comment ?? '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {observationRows.length > 0 && (
            <div className="mt-6">
              <SectionLabel>4.1 Fonctionnement avant intervention</SectionLabel>
              <DossierMobileRecords
                records={observationRows.map((row, index) => ({
                  key: `observation-${index}`,
                  title:
                    normalizeText(row.observation) ??
                    'Observation non renseignée',
                  fields: [
                    {
                      label: 'Constat',
                      value: normalizeText(row.constat) ?? '—',
                    },
                  ],
                }))}
              />
              <div className="hidden md:block">
                <DossierTableFrame minWidth="38rem">
                  <div className="grid grid-cols-[minmax(0,_0.42fr)_minmax(0,_0.58fr)] bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100">
                    <div className="border-r border-neutral-300 px-4 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] dark:border-neutral-600">
                      Observation
                    </div>
                    <div className="px-4 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em]">
                      Constat
                    </div>
                  </div>
                  {observationRows.map((row, index) => (
                    <div
                      key={`${row.observation}-${index}`}
                      className={`grid grid-cols-[minmax(0,_0.42fr)_minmax(0,_0.58fr)] border-t border-neutral-200 dark:border-neutral-700 ${index % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-neutral-50 dark:bg-neutral-800/50'}`}
                    >
                      <div className="border-r border-neutral-200 px-4 py-2.5 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-100">
                        {normalizeText(row.observation) ?? '—'}
                      </div>
                      <div className="px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-200">
                        {normalizeText(row.constat) ?? '—'}
                      </div>
                    </div>
                  ))}
                </DossierTableFrame>
              </div>
            </div>
          )}

          {componentRows.length > 0 && (
            <div className="mt-6">
              <SectionLabel>4.2 État visuel des composants</SectionLabel>
              <DossierMobileRecords
                records={componentRows.map((row, index) => ({
                  key: `component-${index}`,
                  title:
                    normalizeText(row.composant) ?? 'Composant non renseigné',
                  fields: [
                    {
                      label: 'Observations',
                      value: normalizeText(row.observations) ?? '—',
                    },
                  ],
                }))}
              />
              <div className="hidden md:block">
                <DossierTableFrame minWidth="38rem">
                  <div className="grid grid-cols-[minmax(0,_0.28fr)_minmax(0,_0.72fr)] bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100">
                    <div className="border-r border-neutral-300 px-4 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] dark:border-neutral-600">
                      Composant
                    </div>
                    <div className="px-4 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em]">
                      Observations
                    </div>
                  </div>
                  {componentRows.map((row, index) => (
                    <div
                      key={`${row.composant}-${index}`}
                      className={`grid grid-cols-[minmax(0,_0.28fr)_minmax(0,_0.72fr)] border-t border-neutral-200 dark:border-neutral-700 ${index % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-neutral-50 dark:bg-neutral-800/50'}`}
                    >
                      <div className="border-r border-neutral-200 px-4 py-2.5 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-100">
                        {normalizeText(row.composant) ?? '—'}
                      </div>
                      <div className="px-4 py-2.5 text-sm leading-[1.7] text-neutral-700 dark:text-neutral-200">
                        {normalizeText(row.observations) ?? '—'}
                      </div>
                    </div>
                  ))}
                </DossierTableFrame>
              </div>
            </div>
          )}
        </DossierSection>
      )}

      {(publicOperationsSummary.length > 0 ||
        repairOperationRows.length > 0 ||
        replacedPartRows.length > 0) && (
        <DossierSection index="5" title="Opérations de réparation">
          {publicOperationsSummary.length > 0 && (
            <div>
              <SectionLabel>5.0 Résumé public fiche produit</SectionLabel>
              <ul className="space-y-2 text-sm text-neutral-700 dark:text-neutral-200">
                {publicOperationsSummary.map((item, index) => (
                  <li key={`${item}-${index}`} className="flex gap-2">
                    <span className="mt-1 text-neutral-600 dark:text-neutral-300">
                      •
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {repairOperationRows.length > 0 && (
            <div className="mt-6">
              <DossierMobileRecords
                records={repairOperationRows.map((row, index) => ({
                  key: `repair-operation-${index}`,
                  title:
                    normalizeText(row.operation) ?? 'Opération non renseignée',
                  fields: [
                    {
                      label: 'Réalisée',
                      value:
                        row.realisee === true
                          ? 'Oui'
                          : row.realisee === false
                            ? 'Non'
                            : '—',
                    },
                    {
                      label: 'Observations',
                      value: normalizeText(row.observations) ?? '—',
                    },
                  ],
                }))}
              />
              <div className="hidden md:block">
                <DossierTableFrame minWidth="52rem">
                  <div className="grid grid-cols-[minmax(0,_0.45fr)_minmax(0,_0.16fr)_minmax(0,_0.39fr)] bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100">
                    <div className="border-r border-neutral-300 px-4 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] dark:border-neutral-600">
                      5.1 Opération
                    </div>
                    <div className="border-r border-neutral-300 px-4 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] dark:border-neutral-600">
                      Réalisée
                    </div>
                    <div className="px-4 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em]">
                      Observations
                    </div>
                  </div>
                  {repairOperationRows.map((row, index) => (
                    <div
                      key={`${row.operation}-${index}`}
                      className={`grid grid-cols-[minmax(0,_0.45fr)_minmax(0,_0.16fr)_minmax(0,_0.39fr)] border-t border-neutral-200 dark:border-neutral-700 ${index % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-neutral-50 dark:bg-neutral-800/50'}`}
                    >
                      <div className="border-r border-neutral-200 px-4 py-2.5 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-100">
                        {normalizeText(row.operation) ?? '—'}
                      </div>
                      <div className="border-r border-neutral-200 px-4 py-2.5 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-100">
                        {row.realisee === true
                          ? 'Oui'
                          : row.realisee === false
                            ? 'Non'
                            : '—'}
                      </div>
                      <div className="px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-200">
                        {normalizeText(row.observations) ?? '—'}
                      </div>
                    </div>
                  ))}
                </DossierTableFrame>
              </div>
            </div>
          )}

          {replacedPartRows.length > 0 && (
            <div className="mt-6">
              <DossierMobileRecords
                records={replacedPartRows.map((row, index) => ({
                  key: `replaced-part-${index}`,
                  title:
                    normalizeText(row.designationPiece) ??
                    'Pièce non renseignée',
                  fields: [
                    {
                      label: 'Référence / calibre',
                      value: normalizeText(row.referenceCalibre) ?? '—',
                    },
                    {
                      label: 'Quantité',
                      value: row.quantite ?? '—',
                    },
                    {
                      label: 'Origine',
                      value: normalizeText(row.origine) ?? '—',
                    },
                    {
                      label: 'État',
                      value:
                        row.etatPiece === 'orig'
                          ? 'Orig.'
                          : row.etatPiece === 'rep'
                            ? 'Rep.'
                            : '—',
                    },
                  ],
                }))}
              />
              <div className="hidden md:block">
                <DossierTableFrame minWidth="64rem">
                  <div className="grid grid-cols-[minmax(0,_0.3fr)_minmax(0,_0.22fr)_minmax(0,_0.1fr)_minmax(0,_0.18fr)_minmax(0,_0.2fr)] bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100">
                    <div className="border-r border-neutral-300 px-4 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] dark:border-neutral-600">
                      5.2 Pièce
                    </div>
                    <div className="border-r border-neutral-300 px-4 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] dark:border-neutral-600">
                      Référence / calibre
                    </div>
                    <div className="border-r border-neutral-300 px-4 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] dark:border-neutral-600">
                      Qté
                    </div>
                    <div className="border-r border-neutral-300 px-4 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] dark:border-neutral-600">
                      Origine
                    </div>
                    <div className="px-4 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em]">
                      État
                    </div>
                  </div>
                  {replacedPartRows.map((row, index) => (
                    <div
                      key={`${row.designationPiece}-${index}`}
                      className={`grid grid-cols-[minmax(0,_0.3fr)_minmax(0,_0.22fr)_minmax(0,_0.1fr)_minmax(0,_0.18fr)_minmax(0,_0.2fr)] border-t border-neutral-200 dark:border-neutral-700 ${index % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-neutral-50 dark:bg-neutral-800/50'}`}
                    >
                      <div className="border-r border-neutral-200 px-4 py-2.5 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-100">
                        {normalizeText(row.designationPiece) ?? '—'}
                      </div>
                      <div className="border-r border-neutral-200 px-4 py-2.5 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-200">
                        {normalizeText(row.referenceCalibre) ?? '—'}
                      </div>
                      <div className="border-r border-neutral-200 px-4 py-2.5 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-200">
                        {row.quantite ?? '—'}
                      </div>
                      <div className="border-r border-neutral-200 px-4 py-2.5 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-200">
                        {normalizeText(row.origine) ?? '—'}
                      </div>
                      <div className="px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-200">
                        {row.etatPiece === 'orig'
                          ? 'Orig.'
                          : row.etatPiece === 'rep'
                            ? 'Rep.'
                            : '—'}
                      </div>
                    </div>
                  ))}
                </DossierTableFrame>
              </div>
            </div>
          )}
        </DossierSection>
      )}

      {(timingRows.length > 0 ||
        waterResistanceRows.length > 0 ||
        qualityNotes) && (
        <DossierSection index="6" title="Contrôle qualité & mesures">
          {timingRows.length > 0 && (
            <>
              <DossierMobileRecords
                records={timingRows.map((row, index) => ({
                  key: `timing-row-${index}`,
                  title:
                    normalizeText(row.position) ?? 'Position non renseignée',
                  fields: [
                    {
                      label: 'Rate',
                      value: normalizeText(row.rate) ?? '—',
                    },
                    {
                      label: 'Amplitude',
                      value: normalizeText(row.amplitude) ?? '—',
                    },
                    {
                      label: 'Beat error',
                      value: normalizeText(row.beatError) ?? '—',
                    },
                    {
                      label: 'Fréquence',
                      value: normalizeText(row.frequence) ?? '—',
                    },
                    {
                      label: 'Résultat',
                      value: normalizeText(row.resultat) ?? '—',
                    },
                  ],
                }))}
              />
              <div className="hidden md:block">
                <DossierTableFrame minWidth="68rem">
                  <div className="grid grid-cols-[minmax(0,_0.28fr)_minmax(0,_0.12fr)_minmax(0,_0.14fr)_minmax(0,_0.16fr)_minmax(0,_0.12fr)_minmax(0,_0.18fr)] bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100">
                    {[
                      '6.1 Position',
                      'Rate',
                      'Amplitude',
                      'Beat error',
                      'Fréquence',
                      'Résultat',
                    ].map((label, index) => (
                      <div
                        key={label}
                        className={`px-3 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] ${index < 5 ? 'border-r border-neutral-300 dark:border-neutral-600' : ''}`}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                  {timingRows.map((row, index) => (
                    <div
                      key={`${row.position}-${index}`}
                      className={`grid grid-cols-[minmax(0,_0.28fr)_minmax(0,_0.12fr)_minmax(0,_0.14fr)_minmax(0,_0.16fr)_minmax(0,_0.12fr)_minmax(0,_0.18fr)] border-t border-neutral-200 dark:border-neutral-700 ${index % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-neutral-50 dark:bg-neutral-800/50'}`}
                    >
                      {[
                        row.position,
                        row.rate,
                        row.amplitude,
                        row.beatError,
                        row.frequence,
                        row.resultat,
                      ].map((value, cellIndex) => (
                        <div
                          key={cellIndex}
                          className={`px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 ${cellIndex < 5 ? 'border-r border-neutral-200 dark:border-neutral-700' : ''}`}
                        >
                          {normalizeText(value) ?? '—'}
                        </div>
                      ))}
                    </div>
                  ))}
                </DossierTableFrame>
              </div>
            </>
          )}

          {waterResistanceRows.length > 0 && (
            <div className="mt-6">
              <DossierMobileRecords
                records={waterResistanceRows.map((row, index) => ({
                  key: `water-resistance-${index}`,
                  title: normalizeText(row.test) ?? 'Test non renseigné',
                  fields: [
                    {
                      label: 'Valeur / résultat',
                      value: normalizeText(row.valeurResultat) ?? '—',
                    },
                    {
                      label: 'Observations',
                      value: normalizeText(row.observations) ?? '—',
                    },
                  ],
                }))}
              />
              <div className="hidden md:block">
                <DossierTableFrame minWidth="44rem">
                  <div className="grid grid-cols-[minmax(0,_0.34fr)_minmax(0,_0.26fr)_minmax(0,_0.4fr)] bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100">
                    {['6.2 Test', 'Valeur / résultat', 'Observations'].map(
                      (label, index) => (
                        <div
                          key={label}
                          className={`px-3 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] ${index < 2 ? 'border-r border-neutral-300 dark:border-neutral-600' : ''}`}
                        >
                          {label}
                        </div>
                      )
                    )}
                  </div>
                  {waterResistanceRows.map((row, index) => (
                    <div
                      key={`${row.test}-${index}`}
                      className={`grid grid-cols-[minmax(0,_0.34fr)_minmax(0,_0.26fr)_minmax(0,_0.4fr)] border-t border-neutral-200 dark:border-neutral-700 ${index % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-neutral-50 dark:bg-neutral-800/50'}`}
                    >
                      {[row.test, row.valeurResultat, row.observations].map(
                        (value, cellIndex) => (
                          <div
                            key={cellIndex}
                            className={`px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 ${cellIndex < 2 ? 'border-r border-neutral-200 dark:border-neutral-700' : ''}`}
                          >
                            {normalizeText(value) ?? '—'}
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </DossierTableFrame>
              </div>
            </div>
          )}

          {qualityNotes && (
            <div className="mt-6 rounded-xl border border-neutral-200 p-4 text-sm leading-[1.7] text-neutral-700 dark:border-neutral-700 dark:text-neutral-200">
              <SectionLabel>6.3 Observations & conclusions</SectionLabel>
              {qualityNotes}
            </div>
          )}
        </DossierSection>
      )}

      {dossierBlocks.length > 0 && (
        <DossierSection index="7" title="Dossier complémentaire">
          <WatchFileDossierBlocks blocks={dossierBlocks} locale={locale} />
        </DossierSection>
      )}

      {hasValidationAtelier && (
        <DossierSection index="8" title="Validation atelier">
          <DossierFactGrid
            items={[
              {
                key: 'validation-watchmaker',
                label: 'Horloger',
                value: 'Romain Calmelet',
              },
              {
                key: 'validation-end-date',
                label: 'Date de fin',
                value: validationAtelier?.dateFin
                  ? formatLongDate(validationAtelier.dateFin)
                  : '—',
              },
              {
                key: 'validation-duration',
                label: "Durée d'intervention",
                value:
                  normalizeText(validationAtelier?.dureeIntervention) ?? '—',
              },
            ]}
          />

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <SectionLabel>Signature</SectionLabel>
              <div className="flex min-h-24 items-end rounded-xl border border-neutral-200 bg-neutral-50/80 px-4 pb-3 pt-4 dark:border-neutral-700 dark:bg-neutral-800/40">
                {validationAtelier?.signature?.url ? (
                  <Image
                    src={
                      cleanImageUrl(validationAtelier.signature.url) ??
                      validationAtelier.signature.url
                    }
                    alt={
                      validationAtelier.signature.alternativeText ??
                      'Signature de Romain Calmelet'
                    }
                    width={160}
                    height={64}
                    className="h-14 w-auto object-contain"
                  />
                ) : (
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    Aucune signature enregistrée
                  </span>
                )}
              </div>
            </div>
            <div>
              <SectionLabel>Date</SectionLabel>
              <div className="flex min-h-24 items-center rounded-xl border border-neutral-200 bg-neutral-50/80 px-4 py-4 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-neutral-100">
                {validationAtelier?.dateSignature
                  ? formatLongDate(validationAtelier.dateSignature)
                  : 'Aucune date de signature'}
              </div>
            </div>
          </div>
        </DossierSection>
      )}

      {/* Linked order */}
      {watchFile.order && (
        <DossierSection index="9" title="Commande associée">
          <Link
            href={`/${locale}/espace-client/commandes/${watchFile.order.documentId}`}
            className="font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.08em] text-neutral-600 transition-colors hover:text-black dark:text-neutral-300 dark:hover:text-white"
          >
            Commande #{watchFile.order.documentId.slice(-8).toUpperCase()}
          </Link>
        </DossierSection>
      )}
    </div>
  )
}
