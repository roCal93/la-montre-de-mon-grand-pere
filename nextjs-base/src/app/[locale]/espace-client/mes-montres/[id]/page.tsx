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
  extractPlainTextFromStrapiBlocks,
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
  product?: { name: string; slug: string }
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
    ['Boîtier', globalState.boitier],
    ['Cadran', globalState.cadran],
    ['Mouvement', globalState.mouvement],
    ['Bracelet', globalState.bracelet],
  ]
    .map(([label, item]) => {
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
      <div className="rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm shadow-black/5 dark:border-neutral-600 dark:bg-neutral-900 sm:p-6">
        {children}
      </div>
    </section>
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
  query.set('populate[product]', 'true')
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
  appendWatchFileDossierBlocksPopulate(query)

  const { data, error } = await strapiAuthGet<StrapiSingle<WatchFile>>(
    `/watch-files/${id}?${query.toString()}`,
    0
  )

  const watchFile = data?.data
  if (!watchFile || error) notFound()

  const dossierBlocks = filterRenderableWatchFileDossierBlocks(
    watchFile.dossierBlocks
  )
  const narrativeDossierBlocks = dossierBlocks.filter(
    (block) => block.__component !== 'watch-file.before-after-block'
  )
  const beforeAfterDossierBlocks = dossierBlocks.filter(
    (block) => block.__component === 'watch-file.before-after-block'
  )
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

      <div className="border-b border-neutral-300 pb-6 dark:border-neutral-600">
        <div className="grid gap-6 md:grid-cols-[minmax(0,_1fr)_auto] md:items-start">
          <div>
            <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.14em] text-neutral-600 dark:text-neutral-300">
              Dossier montre
            </p>
            <h1 className="mt-2 text-[23px] font-medium leading-snug text-neutral-900 dark:text-white">
              {watchFile.product?.name ?? `Dossier ${watchFile.reference}`}
            </h1>
            <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.12em] text-neutral-700 dark:text-neutral-200">
              REF — {watchFile.reference}
            </p>

            {publicSummary && (
              <div className="my-5 max-w-3xl">
                <p className="mb-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.15em] text-neutral-600 dark:text-neutral-300">
                  Résumé
                </p>
                <p className="border-l-4 border-black pl-4 text-[14px] leading-[1.8] text-neutral-700 dark:text-neutral-200">
                  {publicSummary}
                </p>
              </div>
            )}

            {publicBadgeLabels.length > 0 && (
              <div className="flex flex-wrap gap-2">
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
          </div>

          <Link
            href={`/api/watch-files/${watchFile.documentId}/pdf`}
            className="inline-flex items-center justify-center self-start rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-[13px] font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.08em] text-white shadow-sm shadow-black/10 transition-colors hover:bg-neutral-700 dark:border-neutral-200 dark:bg-neutral-100 dark:text-black dark:hover:bg-white"
          >
            Télécharger le dossier PDF
          </Link>
        </div>
      </div>

      {publicHistory && (
        <DossierSection index="1" title="Histoire">
          <div
            className="border-l-4 border-black pl-4 text-[14px] leading-[1.8] text-neutral-700 dark:text-neutral-200 [&_p]:mb-3 [&_p:last-child]:mb-0"
            dangerouslySetInnerHTML={{ __html: publicHistory }}
          />
        </DossierSection>
      )}

      <DossierSection index="2" title="Informations dossier">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.12em] text-neutral-600 dark:text-neutral-300">
              Référence dossier
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900 dark:text-white">
              {watchFile.reference}
            </dd>
          </div>
          <div>
            <dt className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.12em] text-neutral-600 dark:text-neutral-300">
              Horloger responsable
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900 dark:text-white">
              Romain Calmelet
            </dd>
          </div>
          <div>
            <dt className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.12em] text-neutral-600 dark:text-neutral-300">
              Date de réception
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900 dark:text-white">
              {formatLongDate(watchFile.dateReception)}
            </dd>
          </div>
          <div>
            <dt className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.12em] text-neutral-600 dark:text-neutral-300">
              Date de mise en vente
            </dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900 dark:text-white">
              {formatLongDate(watchFile.dateMiseEnVente)}
            </dd>
          </div>
        </dl>
      </DossierSection>

      <DossierSection index="3" title="Identification de la montre">
        <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
          {identificationRows.map((row, index) => (
            <div
              key={row[0]}
              className={`grid grid-cols-1 border-t border-neutral-200 dark:border-neutral-700 sm:grid-cols-[minmax(0,_0.24fr)_minmax(0,_0.26fr)_minmax(0,_0.24fr)_minmax(0,_0.26fr)] ${index === 0 ? 'border-t-0' : ''} ${index % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-neutral-50 dark:bg-neutral-800/50'}`}
            >
              <div className="border-b border-neutral-200 px-4 py-2 sm:border-b-0 sm:border-r dark:border-neutral-700">
                <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-600 dark:text-neutral-300">
                  {row[0]}
                </p>
              </div>
              <div className="border-b border-neutral-200 px-4 py-2 sm:border-b-0 sm:border-r dark:border-neutral-700">
                <p className="text-sm text-neutral-700 dark:text-neutral-200">
                  {row[1]}
                </p>
              </div>
              <div className="border-b border-neutral-200 px-4 py-2 sm:border-b-0 sm:border-r dark:border-neutral-700">
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
              <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
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
              </div>
            </div>
          )}

          {componentRows.length > 0 && (
            <div className="mt-6">
              <SectionLabel>4.2 État visuel des composants</SectionLabel>
              <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
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
            <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
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
            </div>
          )}

          {replacedPartRows.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
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
            </div>
          )}
        </DossierSection>
      )}

      {(timingRows.length > 0 ||
        waterResistanceRows.length > 0 ||
        qualityNotes) && (
        <DossierSection index="6" title="Contrôle qualité & mesures">
          {timingRows.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
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
            </div>
          )}

          {waterResistanceRows.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
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
          {narrativeDossierBlocks.map((block, index) => {
            const plainText =
              block.__component === 'watch-file.before-after-block'
                ? ''
                : extractPlainTextFromStrapiBlocks(block.content)

            const paragraphs = plainText
              .split(/\n{2,}/)
              .map((paragraph) => paragraph.trim())
              .filter((paragraph) => paragraph.length > 0)

            return (
              <section
                key={`${block.__component}-${block.id ?? index}`}
                className="mt-6 rounded-[1.75rem] border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 md:p-8"
              >
                {block.title ? (
                  <div className="mb-5">
                    <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.14em] text-neutral-600 dark:text-neutral-300">
                      Dossier narratif
                    </p>
                    <h2 className="mt-2 text-2xl font-serif font-semibold text-neutral-900 dark:text-white">
                      {block.title}
                    </h2>
                  </div>
                ) : null}

                {block.__component === 'watch-file.text-image-block' &&
                block.image?.url ? (
                  <div className="mb-6 overflow-hidden rounded-[1.5rem] border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
                    <Image
                      src={cleanImageUrl(block.image.url) ?? block.image.url}
                      alt={
                        block.image.alternativeText ??
                        block.title ??
                        'Image du dossier'
                      }
                      width={1200}
                      height={900}
                      className="h-auto w-full object-cover"
                    />
                  </div>
                ) : null}

                <div className="space-y-4">
                  {paragraphs.map((paragraph, paragraphIndex) => (
                    <p
                      key={paragraphIndex}
                      className="text-[15px] leading-[1.85] text-neutral-700 dark:text-neutral-200"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            )
          })}

          {beforeAfterDossierBlocks.length > 0 && (
            <WatchFileDossierBlocks
              blocks={beforeAfterDossierBlocks}
              locale={locale}
            />
          )}
        </DossierSection>
      )}

      {hasValidationAtelier && (
        <DossierSection index="8" title="Validation atelier">
          <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
            <div className="grid grid-cols-2 bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100 sm:grid-cols-4">
              {['Horloger', 'Date de fin', "Durée d'intervention", ''].map(
                (label, index) => (
                  <div
                    key={`${label}-${index}`}
                    className={`px-4 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] ${index < 3 ? 'border-r border-neutral-300 dark:border-neutral-600' : ''} ${index === 3 ? 'hidden sm:block' : ''}`}
                  >
                    {label}
                  </div>
                )
              )}
            </div>
            <div className="grid grid-cols-1 border-t border-neutral-200 dark:border-neutral-700 sm:grid-cols-[minmax(0,_1fr)_minmax(0,_1fr)]">
              <div className="grid grid-cols-2 sm:grid-cols-[minmax(0,_1fr)_minmax(0,_1fr)]">
                <div className="border-r border-neutral-200 px-4 py-3 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-100">
                  Romain Calmelet
                </div>
                <div className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-100">
                  {validationAtelier?.dateFin
                    ? formatLongDate(validationAtelier.dateFin)
                    : '—'}
                </div>
              </div>
              <div className="grid grid-cols-2 border-t border-neutral-200 sm:border-l sm:border-t-0 dark:border-neutral-700 sm:grid-cols-[minmax(0,_1fr)_minmax(0,_1fr)]">
                <div className="border-r border-neutral-200 px-4 py-3 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-100">
                  {normalizeText(validationAtelier?.dureeIntervention) ?? '—'}
                </div>
                <div className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-100">
                  —
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <SectionLabel>Signature</SectionLabel>
              <div className="border-b border-neutral-300 pb-2 dark:border-neutral-600">
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
                    className="h-16 w-auto object-contain"
                  />
                ) : (
                  <div className="h-16" />
                )}
              </div>
            </div>
            <div>
              <SectionLabel>Date</SectionLabel>
              <div className="border-b border-neutral-300 pb-2 text-sm text-neutral-700 dark:border-neutral-600 dark:text-neutral-100">
                {validationAtelier?.dateSignature
                  ? formatLongDate(validationAtelier.dateSignature)
                  : ' '}
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
