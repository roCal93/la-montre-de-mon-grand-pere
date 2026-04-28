import { NextRequest, NextResponse } from 'next/server'
import {
  Document,
  type DocumentProps,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'
import { createElement, type ReactElement } from 'react'
import { getStrapiSessionJwt } from '@/lib/strapi-session-cookie'
import { cleanImageUrl } from '@/lib/strapi'
import {
  appendWatchFileDossierBlocksPopulate,
  extractPlainTextFromStrapiBlocks,
  type WatchFileBeforeAfterDossierBlock,
  type WatchFileDossierBlock,
  type WatchFileRichTextDossierBlock,
  type WatchFileTextImageDossierBlock,
} from '@/lib/watch-file-dossier-blocks'

export const runtime = 'nodejs'

interface MediaFile {
  url: string
  alternativeText?: string
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
  notesIdentification?: string | null
  publicBadges?: string[] | null
  etatGeneral?: EtatGeneral | null
  operationsReparation?: OperationsReparation | null
  controleQualiteMesures?: ControleQualiteMesures | null
  validationAtelier?: ValidationAtelier | null
  dossierBlocks?: WatchFileDossierBlock[] | null
  dateReception?: string
  dateMiseEnVente?: string
  publicBeforeImage?: MediaFile[]
  publicAfterImage?: MediaFile[]
  order?: { documentId: string; createdAt: string }
  product?: {
    name: string
    slug?: string
  }
}

function asText(value: unknown, fallback = '-'): string {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : fallback
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return fallback
}

function formatDate(value?: string): string {
  if (!value) return 'Non renseignee'

  return new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function stripHtml(html?: string): string {
  if (!html) return ''

  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatRestorationWork(items?: string[] | null): string {
  if (!items?.length) return ''

  return items
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .join(' • ')
}

function formatPublicOperationsSummary(
  operationsReparation?: OperationsReparation | null
): string {
  return (operationsReparation?.operationsPubliques ?? '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .join(' • ')
}

function normalizeText(
  value: string | null | undefined,
  fallback = ''
): string {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallback
}

function normalizePercentage(value?: number | null): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return Math.max(0, Math.min(100, value))
}

function buildGlobalEtatRows(etatGeneral?: EtatGeneral | null) {
  const globalState = etatGeneral?.etatGeneralGlobal
  if (!globalState) return []

  return [
    ['Boitier', globalState.boitier],
    ['Cadran', globalState.cadran],
    ['Mouvement', globalState.mouvement],
    ['Bracelet', globalState.bracelet],
  ]
    .map(([label, item]) => {
      const percentage = normalizePercentage(item?.pourcentage)
      const comment = normalizeText(item?.commentaire)
      if (percentage === null && !comment) return null

      return { label, percentage: percentage ?? 0, comment: comment || '-' }
    })
    .filter(
      (row): row is { label: string; percentage: number; comment: string } =>
        row !== null
    )
}

function buildObservationEtatRows(etatGeneral?: EtatGeneral | null) {
  return (etatGeneral?.fonctionnementAvantIntervention ?? []).filter(
    (row) => normalizeText(row.observation) || normalizeText(row.constat)
  )
}

function buildComponentEtatRows(etatGeneral?: EtatGeneral | null) {
  return (etatGeneral?.etatVisuelComposants ?? []).filter(
    (row) => normalizeText(row.composant) || normalizeText(row.observations)
  )
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

function buildTimingMeasureRows(
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

function buildWaterResistanceMeasureRows(
  controleQualiteMesures?: ControleQualiteMesures | null
) {
  return (controleQualiteMesures?.testEtancheite ?? []).filter(
    (row) =>
      normalizeText(row.test) ||
      normalizeText(row.valeurResultat) ||
      normalizeText(row.observations)
  )
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingHorizontal: 34,
    paddingBottom: 26,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1c1917',
    backgroundColor: '#ffffff',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#c3a13b',
  },
  topBarLeft: {
    fontSize: 7,
    color: '#5d6a77',
    textTransform: 'uppercase',
  },
  topBarRight: {
    fontSize: 7,
    color: '#7c8792',
  },
  hero: {
    marginTop: 26,
    marginBottom: 34,
    alignItems: 'center',
  },
  heroLineOne: {
    fontSize: 26,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    letterSpacing: 0.5,
    color: '#223f63',
    textAlign: 'center',
  },
  heroLineTwo: {
    marginTop: 4,
    fontSize: 24,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    letterSpacing: 0.4,
    color: '#c39a2d',
    textAlign: 'center',
  },
  heroDivider: {
    marginTop: 16,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#c3a13b',
  },
  dossierTable: {
    width: 336,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#c6ccd3',
    marginBottom: 30,
  },
  dossierRow: {
    flexDirection: 'row',
    minHeight: 27,
    borderBottomWidth: 1,
    borderBottomColor: '#c6ccd3',
  },
  dossierRowLast: {
    borderBottomWidth: 0,
  },
  dossierLabelCell: {
    width: 126,
    backgroundColor: '#1f3d61',
    paddingHorizontal: 10,
    paddingVertical: 7,
    justifyContent: 'center',
  },
  dossierLabelText: {
    fontSize: 9,
    color: '#ffffff',
    fontFamily: 'Helvetica',
    fontWeight: 700,
  },
  dossierValueCell: {
    flex: 1,
    backgroundColor: '#eef2f6',
    paddingHorizontal: 8,
    paddingVertical: 7,
    justifyContent: 'center',
  },
  dossierValueText: {
    fontSize: 10,
    color: '#1c1917',
  },
  section: {
    marginTop: 18,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    marginBottom: 8,
    color: '#223f63',
    textTransform: 'uppercase',
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#292524',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    left: 34,
    right: 34,
    bottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#d5dbe2',
  },
  footerText: {
    fontSize: 7,
    color: '#b3b8be',
  },
  contentHeading: {
    fontSize: 20,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#223f63',
    marginBottom: 8,
  },
  contentDivider: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#c3a13b',
  },
  subsectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#223f63',
    marginBottom: 6,
  },
  identificationTable: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#c6ccd3',
    marginBottom: 16,
  },
  identificationRow: {
    flexDirection: 'row',
    minHeight: 26,
    borderBottomWidth: 1,
    borderBottomColor: '#c6ccd3',
  },
  identificationRowLast: {
    borderBottomWidth: 0,
  },
  identificationLabel: {
    width: '24%',
    backgroundColor: '#eef2f6',
    paddingHorizontal: 7,
    paddingVertical: 6,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#c6ccd3',
  },
  identificationLabelText: {
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#22313f',
  },
  identificationValue: {
    width: '26%',
    paddingHorizontal: 7,
    paddingVertical: 6,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#c6ccd3',
  },
  identificationValueLast: {
    borderRightWidth: 0,
  },
  identificationValueText: {
    fontSize: 9,
    color: '#1c1917',
  },
  notesBox: {
    width: '100%',
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#c6ccd3',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dossierBlockTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#223f63',
    marginBottom: 10,
  },
  dossierBlockText: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#292524',
  },
  dossierColumns: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'stretch',
  },
  dossierColumn: {
    flex: 1,
  },
  dossierImageFrame: {
    borderWidth: 1,
    borderColor: '#d5dbe2',
    padding: 6,
    backgroundColor: '#f8fafc',
  },
  dossierImage: {
    width: '100%',
    height: 260,
    objectFit: 'cover',
  },
  dossierImageCaption: {
    marginTop: 6,
    fontSize: 8,
    color: '#5d6a77',
    textTransform: 'uppercase',
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stateLabel: {
    width: 84,
    fontSize: 11,
    color: '#8b9198',
  },
  stateBarTrack: {
    flex: 1,
    height: 5,
    backgroundColor: '#eceff3',
    marginHorizontal: 16,
  },
  stateBarFill: {
    height: 5,
    backgroundColor: '#111827',
  },
  stateComment: {
    width: 96,
    fontSize: 11,
    textAlign: 'right',
    color: '#374151',
  },
  detailTable: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#c6ccd3',
    marginBottom: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    backgroundColor: '#1f3d61',
  },
  detailHeaderCell: {
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRightWidth: 1,
    borderRightColor: '#ffffff26',
  },
  detailHeaderCellLast: {
    borderRightWidth: 0,
  },
  detailHeaderText: {
    fontSize: 8.5,
    color: '#ffffff',
    fontFamily: 'Helvetica',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#c6ccd3',
  },
  detailCell: {
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRightWidth: 1,
    borderRightColor: '#c6ccd3',
  },
  detailCellLast: {
    borderRightWidth: 0,
  },
  detailCellText: {
    fontSize: 9,
    color: '#1c1917',
    lineHeight: 1.45,
  },
})

function buildPdfMediaUrl(url?: string | null) {
  return cleanImageUrl(url ?? undefined) ?? undefined
}

function renderDossierBlockPage(
  watchFile: WatchFile,
  block: WatchFileDossierBlock,
  pageNumber: number
) {
  const title = block.title?.trim() || `Dossier visuel ${pageNumber - 2}`

  if (block.__component === 'watch-file.rich-text-block') {
    return renderPdfRichTextBlockPage(watchFile, block, title, pageNumber)
  }

  if (block.__component === 'watch-file.text-image-block') {
    return renderPdfTextImageBlockPage(watchFile, block, title, pageNumber)
  }

  if (block.__component === 'watch-file.before-after-block') {
    return renderPdfBeforeAfterBlockPage(watchFile, block, title, pageNumber)
  }

  return null
}

function renderPdfRichTextBlockPage(
  watchFile: WatchFile,
  block: WatchFileRichTextDossierBlock,
  title: string,
  pageNumber: number
) {
  const text = extractPlainTextFromStrapiBlocks(block.content)
  if (!text) return null

  return createElement(
    Page,
    { size: 'A4', style: styles.page, key: `dossier-page-${pageNumber}` },
    createPdfTopBar(watchFile),
    createElement(Text, { style: styles.dossierBlockTitle }, title),
    createElement(View, { style: styles.contentDivider }),
    createElement(Text, { style: styles.dossierBlockText }, text),
    createPdfFooter(pageNumber)
  )
}

function renderPdfTextImageBlockPage(
  watchFile: WatchFile,
  block: WatchFileTextImageDossierBlock,
  title: string,
  pageNumber: number
) {
  const text = extractPlainTextFromStrapiBlocks(block.content)
  const imageUrl = buildPdfMediaUrl(block.image?.url)

  if (!text && !imageUrl) return null

  const textColumn = createElement(
    View,
    { style: styles.dossierColumn },
    text ? createElement(Text, { style: styles.dossierBlockText }, text) : null
  )
  const imageColumn = imageUrl
    ? createElement(
        View,
        { style: styles.dossierColumn },
        createElement(
          View,
          { style: styles.dossierImageFrame },
          createElement(Image, {
            src: imageUrl,
            style: styles.dossierImage,
          })
        )
      )
    : null

  return createElement(
    Page,
    { size: 'A4', style: styles.page, key: `dossier-page-${pageNumber}` },
    createPdfTopBar(watchFile),
    createElement(Text, { style: styles.dossierBlockTitle }, title),
    createElement(View, { style: styles.contentDivider }),
    createElement(
      View,
      { style: styles.dossierColumns },
      block.imagePosition === 'left'
        ? [imageColumn, textColumn]
        : [textColumn, imageColumn]
    ),
    createPdfFooter(pageNumber)
  )
}

function renderPdfBeforeAfterBlockPage(
  watchFile: WatchFile,
  block: WatchFileBeforeAfterDossierBlock,
  title: string,
  pageNumber: number
) {
  const beforeUrl = buildPdfMediaUrl(block.beforeImage?.url)
  const afterUrl = buildPdfMediaUrl(block.afterImage?.url)

  if (!beforeUrl || !afterUrl) return null

  return createElement(
    Page,
    { size: 'A4', style: styles.page, key: `dossier-page-${pageNumber}` },
    createPdfTopBar(watchFile),
    createElement(Text, { style: styles.dossierBlockTitle }, title),
    createElement(View, { style: styles.contentDivider }),
    createElement(
      View,
      { style: styles.dossierColumns },
      createElement(
        View,
        { style: styles.dossierColumn },
        createElement(
          View,
          { style: styles.dossierImageFrame },
          createElement(Image, {
            src: beforeUrl,
            style: styles.dossierImage,
          })
        ),
        createElement(Text, { style: styles.dossierImageCaption }, 'Avant')
      ),
      createElement(
        View,
        { style: styles.dossierColumn },
        createElement(
          View,
          { style: styles.dossierImageFrame },
          createElement(Image, {
            src: afterUrl,
            style: styles.dossierImage,
          })
        ),
        createElement(Text, { style: styles.dossierImageCaption }, 'Après')
      )
    ),
    createPdfFooter(pageNumber)
  )
}

function createPdfTopBar(watchFile: WatchFile) {
  return createElement(
    View,
    { style: styles.topBar },
    createElement(
      Text,
      { style: styles.topBarLeft },
      'Dossier de reparation horlogere - atelier'
    ),
    createElement(
      Text,
      { style: styles.topBarRight },
      `N° ${asText(watchFile.reference).toUpperCase()}`
    )
  )
}

function createPdfFooter(pageNumber: number) {
  return createElement(
    View,
    { style: styles.footer },
    createElement(
      Text,
      { style: styles.footerText },
      'Document interne - Atelier horlogerie'
    ),
    createElement(Text, { style: styles.footerText }, `Page ${pageNumber}`)
  )
}

function renderPoint2EtatPage(watchFile: WatchFile) {
  const globalRows = buildGlobalEtatRows(watchFile.etatGeneral)
  const observationRows = buildObservationEtatRows(watchFile.etatGeneral)
  const componentRows = buildComponentEtatRows(watchFile.etatGeneral)

  if (
    globalRows.length === 0 &&
    observationRows.length === 0 &&
    componentRows.length === 0
  ) {
    return null
  }

  return createElement(
    Page,
    { size: 'A4', style: styles.page, key: 'etat-general-page' },
    createPdfTopBar(watchFile),
    createElement(
      Text,
      { style: styles.contentHeading },
      '2. ETAT A LA RECEPTION'
    ),
    createElement(View, { style: styles.contentDivider }),
    globalRows.length > 0
      ? createElement(
          View,
          { style: styles.section },
          createElement(
            Text,
            { style: styles.subsectionTitle },
            '2.0 Etat general global'
          ),
          ...globalRows.map((row) =>
            createElement(
              View,
              { key: row.label, style: styles.stateRow },
              createElement(Text, { style: styles.stateLabel }, row.label),
              createElement(
                View,
                { style: styles.stateBarTrack },
                createElement(View, {
                  style: [styles.stateBarFill, { width: `${row.percentage}%` }],
                })
              ),
              createElement(Text, { style: styles.stateComment }, row.comment)
            )
          )
        )
      : null,
    observationRows.length > 0
      ? createElement(
          View,
          { style: styles.section },
          createElement(
            Text,
            { style: styles.subsectionTitle },
            '2.1 Fonctionnement avant intervention'
          ),
          createElement(
            View,
            { style: styles.detailTable },
            createElement(
              View,
              { style: styles.detailHeader },
              createElement(
                View,
                { style: [styles.detailHeaderCell, { width: '42%' }] },
                createElement(
                  Text,
                  { style: styles.detailHeaderText },
                  'Observation'
                )
              ),
              createElement(
                View,
                {
                  style: [
                    styles.detailHeaderCell,
                    styles.detailHeaderCellLast,
                    { width: '58%' },
                  ],
                },
                createElement(
                  Text,
                  { style: styles.detailHeaderText },
                  'Constat'
                )
              )
            ),
            ...observationRows.map((row, index) =>
              createElement(
                View,
                { key: `${row.observation}-${index}`, style: styles.detailRow },
                createElement(
                  View,
                  { style: [styles.detailCell, { width: '42%' }] },
                  createElement(
                    Text,
                    { style: styles.detailCellText },
                    normalizeText(row.observation, '-')
                  )
                ),
                createElement(
                  View,
                  {
                    style: [
                      styles.detailCell,
                      styles.detailCellLast,
                      { width: '58%' },
                    ],
                  },
                  createElement(
                    Text,
                    { style: styles.detailCellText },
                    normalizeText(row.constat, '-')
                  )
                )
              )
            )
          )
        )
      : null,
    componentRows.length > 0
      ? createElement(
          View,
          { style: styles.section },
          createElement(
            Text,
            { style: styles.subsectionTitle },
            '2.2 Etat visuel des composants'
          ),
          createElement(
            View,
            { style: styles.detailTable },
            createElement(
              View,
              { style: styles.detailHeader },
              createElement(
                View,
                { style: [styles.detailHeaderCell, { width: '28%' }] },
                createElement(
                  Text,
                  { style: styles.detailHeaderText },
                  'Composant'
                )
              ),
              createElement(
                View,
                {
                  style: [
                    styles.detailHeaderCell,
                    styles.detailHeaderCellLast,
                    { width: '72%' },
                  ],
                },
                createElement(
                  Text,
                  { style: styles.detailHeaderText },
                  'Observations'
                )
              )
            ),
            ...componentRows.map((row, index) =>
              createElement(
                View,
                { key: `${row.composant}-${index}`, style: styles.detailRow },
                createElement(
                  View,
                  { style: [styles.detailCell, { width: '28%' }] },
                  createElement(
                    Text,
                    { style: styles.detailCellText },
                    normalizeText(row.composant, '-')
                  )
                ),
                createElement(
                  View,
                  {
                    style: [
                      styles.detailCell,
                      styles.detailCellLast,
                      { width: '72%' },
                    ],
                  },
                  createElement(
                    Text,
                    { style: styles.detailCellText },
                    normalizeText(row.observations, '-')
                  )
                )
              )
            )
          )
        )
      : null,
    createPdfFooter(3)
  )
}

function renderPoint3OperationsPage(watchFile: WatchFile, pageNumber: number) {
  const publicSummary = formatPublicOperationsSummary(
    watchFile.operationsReparation
  )
  const repairOperations = buildRepairOperationRows(
    watchFile.operationsReparation
  )
  const replacedParts = buildReplacedPartRows(watchFile.operationsReparation)

  if (
    !publicSummary &&
    repairOperations.length === 0 &&
    replacedParts.length === 0
  ) {
    return null
  }

  return createElement(
    Page,
    { size: 'A4', style: styles.page, key: 'operations-page' },
    createPdfTopBar(watchFile),
    createElement(
      Text,
      { style: styles.contentHeading },
      '3. OPERATIONS DE REPARATION'
    ),
    createElement(View, { style: styles.contentDivider }),
    publicSummary
      ? createElement(
          View,
          { style: styles.section },
          createElement(
            Text,
            { style: styles.subsectionTitle },
            '3.0 Resume public fiche produit'
          ),
          createElement(Text, { style: styles.paragraph }, publicSummary)
        )
      : null,
    repairOperations.length > 0
      ? createElement(
          View,
          { style: styles.section },
          createElement(
            Text,
            { style: styles.subsectionTitle },
            '3.1 Demontage, nettoyage et remontage'
          ),
          createElement(
            View,
            { style: styles.detailTable },
            createElement(
              View,
              { style: styles.detailHeader },
              createElement(
                View,
                { style: [styles.detailHeaderCell, { width: '45%' }] },
                createElement(
                  Text,
                  { style: styles.detailHeaderText },
                  'Operation'
                )
              ),
              createElement(
                View,
                { style: [styles.detailHeaderCell, { width: '16%' }] },
                createElement(
                  Text,
                  { style: styles.detailHeaderText },
                  'Realisee'
                )
              ),
              createElement(
                View,
                {
                  style: [
                    styles.detailHeaderCell,
                    styles.detailHeaderCellLast,
                    { width: '39%' },
                  ],
                },
                createElement(
                  Text,
                  { style: styles.detailHeaderText },
                  'Observations'
                )
              )
            ),
            ...repairOperations.map((row, index) =>
              createElement(
                View,
                { key: `${row.operation}-${index}`, style: styles.detailRow },
                createElement(
                  View,
                  { style: [styles.detailCell, { width: '45%' }] },
                  createElement(
                    Text,
                    { style: styles.detailCellText },
                    normalizeText(row.operation, '-')
                  )
                ),
                createElement(
                  View,
                  { style: [styles.detailCell, { width: '16%' }] },
                  createElement(
                    Text,
                    { style: styles.detailCellText },
                    row.realisee === true
                      ? 'Oui'
                      : row.realisee === false
                        ? 'Non'
                        : '-'
                  )
                ),
                createElement(
                  View,
                  {
                    style: [
                      styles.detailCell,
                      styles.detailCellLast,
                      { width: '39%' },
                    ],
                  },
                  createElement(
                    Text,
                    { style: styles.detailCellText },
                    normalizeText(row.observations, '-')
                  )
                )
              )
            )
          )
        )
      : null,
    replacedParts.length > 0
      ? createElement(
          View,
          { style: styles.section },
          createElement(
            Text,
            { style: styles.subsectionTitle },
            '3.2 Pieces remplacees'
          ),
          createElement(
            View,
            { style: styles.detailTable },
            createElement(
              View,
              { style: styles.detailHeader },
              createElement(
                View,
                { style: [styles.detailHeaderCell, { width: '30%' }] },
                createElement(
                  Text,
                  { style: styles.detailHeaderText },
                  'Designation'
                )
              ),
              createElement(
                View,
                { style: [styles.detailHeaderCell, { width: '22%' }] },
                createElement(
                  Text,
                  { style: styles.detailHeaderText },
                  'Reference / calibre'
                )
              ),
              createElement(
                View,
                { style: [styles.detailHeaderCell, { width: '10%' }] },
                createElement(Text, { style: styles.detailHeaderText }, 'Qte')
              ),
              createElement(
                View,
                { style: [styles.detailHeaderCell, { width: '18%' }] },
                createElement(
                  Text,
                  { style: styles.detailHeaderText },
                  'Origine'
                )
              ),
              createElement(
                View,
                {
                  style: [
                    styles.detailHeaderCell,
                    styles.detailHeaderCellLast,
                    { width: '20%' },
                  ],
                },
                createElement(Text, { style: styles.detailHeaderText }, 'Etat')
              )
            ),
            ...replacedParts.map((row, index) =>
              createElement(
                View,
                {
                  key: `${row.designationPiece}-${index}`,
                  style: styles.detailRow,
                },
                createElement(
                  View,
                  { style: [styles.detailCell, { width: '30%' }] },
                  createElement(
                    Text,
                    { style: styles.detailCellText },
                    normalizeText(row.designationPiece, '-')
                  )
                ),
                createElement(
                  View,
                  { style: [styles.detailCell, { width: '22%' }] },
                  createElement(
                    Text,
                    { style: styles.detailCellText },
                    normalizeText(row.referenceCalibre, '-')
                  )
                ),
                createElement(
                  View,
                  { style: [styles.detailCell, { width: '10%' }] },
                  createElement(
                    Text,
                    { style: styles.detailCellText },
                    row.quantite ? String(row.quantite) : '-'
                  )
                ),
                createElement(
                  View,
                  { style: [styles.detailCell, { width: '18%' }] },
                  createElement(
                    Text,
                    { style: styles.detailCellText },
                    normalizeText(row.origine, '-')
                  )
                ),
                createElement(
                  View,
                  {
                    style: [
                      styles.detailCell,
                      styles.detailCellLast,
                      { width: '20%' },
                    ],
                  },
                  createElement(
                    Text,
                    { style: styles.detailCellText },
                    row.etatPiece === 'orig'
                      ? 'Orig.'
                      : row.etatPiece === 'rep'
                        ? 'Rep.'
                        : '-'
                  )
                )
              )
            )
          )
        )
      : null,
    createPdfFooter(pageNumber)
  )
}

function renderPoint4QualityPage(watchFile: WatchFile, pageNumber: number) {
  const timingRows = buildTimingMeasureRows(watchFile.controleQualiteMesures)
  const waterResistanceRows = buildWaterResistanceMeasureRows(
    watchFile.controleQualiteMesures
  )
  const observations = normalizeText(
    watchFile.controleQualiteMesures?.observationsConclusions,
    ''
  )

  if (
    timingRows.length === 0 &&
    waterResistanceRows.length === 0 &&
    !observations
  ) {
    return null
  }

  return createElement(
    Page,
    { size: 'A4', style: styles.page, key: 'quality-page' },
    createPdfTopBar(watchFile),
    createElement(
      Text,
      { style: styles.contentHeading },
      '4. CONTROLE QUALITE & MESURES'
    ),
    createElement(View, { style: styles.contentDivider }),
    timingRows.length > 0
      ? createElement(
          View,
          { style: styles.section },
          createElement(
            Text,
            { style: styles.subsectionTitle },
            '4.1 Reglage et precision'
          ),
          createElement(
            View,
            { style: styles.detailTable },
            createElement(
              View,
              { style: styles.detailHeader },
              ...[
                ['Position', '28%'],
                ['Rate', '12%'],
                ['Amplitude', '14%'],
                ['Beat error', '16%'],
                ['Frequence', '12%'],
                ['Resultat', '18%'],
              ].map(([label, width], index, array) =>
                createElement(
                  View,
                  {
                    key: label,
                    style: [
                      styles.detailHeaderCell,
                      index === array.length - 1
                        ? styles.detailHeaderCellLast
                        : null,
                      { width },
                    ],
                  },
                  createElement(Text, { style: styles.detailHeaderText }, label)
                )
              )
            ),
            ...timingRows.map((row, index) =>
              createElement(
                View,
                { key: `${row.position}-${index}`, style: styles.detailRow },
                ...[
                  [row.position, '28%'],
                  [row.rate, '12%'],
                  [row.amplitude, '14%'],
                  [row.beatError, '16%'],
                  [row.frequence, '12%'],
                  [row.resultat, '18%'],
                ].map(([value, width], cellIndex, array) =>
                  createElement(
                    View,
                    {
                      key: `${cellIndex}`,
                      style: [
                        styles.detailCell,
                        cellIndex === array.length - 1
                          ? styles.detailCellLast
                          : null,
                        { width },
                      ],
                    },
                    createElement(
                      Text,
                      { style: styles.detailCellText },
                      normalizeText(value, '-')
                    )
                  )
                )
              )
            )
          )
        )
      : null,
    waterResistanceRows.length > 0
      ? createElement(
          View,
          { style: styles.section },
          createElement(
            Text,
            { style: styles.subsectionTitle },
            "4.2 Test d'etancheite"
          ),
          createElement(
            View,
            { style: styles.detailTable },
            createElement(
              View,
              { style: styles.detailHeader },
              ...[
                ['Test', '34%'],
                ['Valeur / resultat', '26%'],
                ['Observations', '40%'],
              ].map(([label, width], index, array) =>
                createElement(
                  View,
                  {
                    key: label,
                    style: [
                      styles.detailHeaderCell,
                      index === array.length - 1
                        ? styles.detailHeaderCellLast
                        : null,
                      { width },
                    ],
                  },
                  createElement(Text, { style: styles.detailHeaderText }, label)
                )
              )
            ),
            ...waterResistanceRows.map((row, index) =>
              createElement(
                View,
                { key: `${row.test}-${index}`, style: styles.detailRow },
                ...[
                  [row.test, '34%'],
                  [row.valeurResultat, '26%'],
                  [row.observations, '40%'],
                ].map(([value, width], cellIndex, array) =>
                  createElement(
                    View,
                    {
                      key: `${cellIndex}`,
                      style: [
                        styles.detailCell,
                        cellIndex === array.length - 1
                          ? styles.detailCellLast
                          : null,
                        { width },
                      ],
                    },
                    createElement(
                      Text,
                      { style: styles.detailCellText },
                      normalizeText(value, '-')
                    )
                  )
                )
              )
            )
          )
        )
      : null,
    observations
      ? createElement(
          View,
          { style: styles.section },
          createElement(
            Text,
            { style: styles.subsectionTitle },
            '4.3 Observations & conclusions'
          ),
          createElement(
            View,
            { style: styles.notesBox },
            createElement(Text, { style: styles.paragraph }, observations)
          )
        )
      : null,
    createPdfFooter(pageNumber)
  )
}

function renderPoint5ValidationPage(watchFile: WatchFile, pageNumber: number) {
  const validationAtelier = watchFile.validationAtelier

  if (
    !validationAtelier?.dateFin &&
    !normalizeText(validationAtelier?.dureeIntervention) &&
    !validationAtelier?.signature?.url &&
    !validationAtelier?.dateSignature
  ) {
    return null
  }

  return createElement(
    Page,
    { size: 'A4', style: styles.page, key: 'validation-page' },
    createPdfTopBar(watchFile),
    createElement(
      Text,
      { style: styles.contentHeading },
      '5. VALIDATION ATELIER'
    ),
    createElement(View, { style: styles.contentDivider }),
    createElement(
      View,
      { style: styles.section },
      createElement(
        View,
        { style: styles.identificationTable },
        createElement(
          View,
          { style: styles.identificationRow },
          createElement(
            View,
            { style: styles.identificationLabel },
            createElement(
              Text,
              { style: styles.identificationLabelText },
              'Horloger'
            )
          ),
          createElement(
            View,
            { style: styles.identificationValue },
            createElement(
              Text,
              { style: styles.identificationValueText },
              'Romain Calmelet'
            )
          ),
          createElement(
            View,
            { style: styles.identificationLabel },
            createElement(
              Text,
              { style: styles.identificationLabelText },
              'Date de fin'
            )
          ),
          createElement(
            View,
            {
              style: [
                styles.identificationValue,
                styles.identificationValueLast,
              ],
            },
            createElement(
              Text,
              { style: styles.identificationValueText },
              validationAtelier?.dateFin
                ? formatDate(validationAtelier.dateFin)
                : '-'
            )
          )
        ),
        createElement(
          View,
          { style: [styles.identificationRow, styles.identificationRowLast] },
          createElement(
            View,
            { style: styles.identificationLabel },
            createElement(
              Text,
              { style: styles.identificationLabelText },
              "Duree d'intervention"
            )
          ),
          createElement(
            View,
            { style: styles.identificationValue },
            createElement(
              Text,
              { style: styles.identificationValueText },
              asText(validationAtelier?.dureeIntervention)
            )
          ),
          createElement(
            View,
            { style: styles.identificationLabel },
            createElement(Text, { style: styles.identificationLabelText }, '')
          ),
          createElement(
            View,
            {
              style: [
                styles.identificationValue,
                styles.identificationValueLast,
              ],
            },
            createElement(Text, { style: styles.identificationValueText }, '')
          )
        )
      )
    ),
    createElement(
      View,
      {
        style: [
          styles.section,
          {
            marginTop: 36,
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 24,
          },
        ],
      },
      createElement(
        View,
        { style: { width: '60%' } },
        createElement(Text, { style: styles.subsectionTitle }, 'Signature :'),
        createElement(View, {
          style: {
            marginTop: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#1c1917',
            minHeight: 54,
            justifyContent: 'flex-end',
          },
        }),
        validationAtelier?.signature?.url
          ? createElement(Image, {
              src:
                cleanImageUrl(validationAtelier.signature.url) ??
                validationAtelier.signature.url,
              style: {
                marginTop: 8,
                maxWidth: 150,
                maxHeight: 52,
                objectFit: 'contain',
              },
            })
          : null
      ),
      createElement(
        View,
        { style: { width: '30%' } },
        createElement(Text, { style: styles.subsectionTitle }, 'Date :'),
        createElement(View, {
          style: {
            marginTop: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#1c1917',
            minHeight: 22,
            justifyContent: 'flex-end',
          },
        }),
        validationAtelier?.dateSignature
          ? createElement(
              Text,
              { style: [styles.paragraph, { marginTop: 8 }] },
              formatDate(validationAtelier.dateSignature)
            )
          : null
      )
    ),
    createPdfFooter(pageNumber)
  )
}

function WatchFileDocument({ watchFile }: { watchFile: WatchFile }) {
  const productName = asText(watchFile.product?.name, 'Montre ancienne')
  const notes = formatPublicOperationsSummary(watchFile.operationsReparation)
  const etatGeneralPage = renderPoint2EtatPage(watchFile)
  const operationsPage = renderPoint3OperationsPage(
    watchFile,
    etatGeneralPage ? 4 : 3
  )
  const qualityPageNumber =
    3 + (etatGeneralPage ? 1 : 0) + (operationsPage ? 1 : 0)
  const qualityPage = renderPoint4QualityPage(watchFile, qualityPageNumber)
  const validationPageNumber = qualityPageNumber + (qualityPage ? 1 : 0)
  const validationPage = renderPoint5ValidationPage(
    watchFile,
    validationPageNumber
  )
  const dossierBlockPages = (watchFile.dossierBlocks ?? [])
    .map((block, index) =>
      renderDossierBlockPage(
        watchFile,
        block,
        index +
          3 +
          (etatGeneralPage ? 1 : 0) +
          (operationsPage ? 1 : 0) +
          (qualityPage ? 1 : 0) +
          (validationPage ? 1 : 0)
      )
    )
    .filter(Boolean)
  const beforeCount = Array.isArray(watchFile.publicBeforeImage)
    ? watchFile.publicBeforeImage.length
    : 0
  const afterCount = Array.isArray(watchFile.publicAfterImage)
    ? watchFile.publicAfterImage.length
    : 0

  const dossierRows = [
    ['Reference dossier', asText(watchFile.reference)],
    ['Date de reception', formatDate(watchFile.dateReception)],
    ['Horloger responsable', 'Romain Calmelet'],
    ['Date de mise en vente', formatDate(watchFile.dateMiseEnVente)],
  ] as const

  const identificationRows = [
    [
      'Marque',
      asText(watchFile.marque, '-'),
      'Modele',
      asText(watchFile.modele ?? watchFile.product?.name, '-'),
    ],
    [
      'Reference',
      asText(watchFile.referencePiece, '-'),
      'Complications',
      asText(watchFile.complications, '-'),
    ],
    [
      'Mouvement',
      asText(watchFile.mouvement, '-'),
      'Calibre',
      asText(watchFile.calibre, '-'),
    ],
    [
      'Annee estimee',
      asText(watchFile.anneeEstimee, '-'),
      'Matiere du boitier',
      asText(watchFile.matiereBoitier, '-'),
    ],
    [
      'Diametre boitier',
      asText(watchFile.diametreBoitier, '-'),
      'Epaisseur',
      asText(watchFile.epaisseur, '-'),
    ],
    [
      'Bracelet / matiere',
      asText(watchFile.matiereBracelet, '-'),
      'Boucle',
      asText(watchFile.boucle, '-'),
    ],
    [
      'Verre',
      asText(watchFile.verre, '-'),
      'Etancheite annoncee',
      asText(watchFile.etancheiteAnnoncee, '-'),
    ],
  ] as const

  const identificationNotes =
    stripHtml(
      watchFile.notesIdentification ??
        watchFile.marketingShortDescription ??
        undefined
    ) || 'A completer'

  return createElement(
    Document,
    null,
    createElement(
      Page,
      { size: 'A4', style: styles.page },
      createPdfTopBar(watchFile),
      createElement(
        View,
        { style: styles.hero },
        createElement(
          Text,
          { style: styles.heroLineOne },
          'DOSSIER DE REPARATION'
        ),
        createElement(Text, { style: styles.heroLineTwo }, 'HORLOGERE'),
        createElement(View, { style: styles.heroDivider })
      ),
      createElement(
        View,
        { style: styles.dossierTable },
        ...dossierRows.map(([label, value], index) =>
          createElement(
            View,
            {
              key: label,
              style: [
                styles.dossierRow,
                index === dossierRows.length - 1 ? styles.dossierRowLast : null,
              ],
            },
            createElement(
              View,
              { style: styles.dossierLabelCell },
              createElement(Text, { style: styles.dossierLabelText }, label)
            ),
            createElement(
              View,
              { style: styles.dossierValueCell },
              createElement(Text, { style: styles.dossierValueText }, value)
            )
          )
        )
      ),
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, productName)
      ),
      notes
        ? createElement(
            View,
            { style: styles.section },
            createElement(
              Text,
              { style: styles.sectionTitle },
              'Resume public'
            ),
            createElement(Text, { style: styles.paragraph }, notes)
          )
        : null,
      createElement(
        View,
        { style: styles.section },
        createElement(
          Text,
          { style: styles.sectionTitle },
          'Pieces du dossier'
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, null, 'Photos avant'),
          createElement(Text, null, `${beforeCount}`)
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, null, 'Photos apres'),
          createElement(Text, null, `${afterCount}`)
        ),
        watchFile.order
          ? createElement(
              View,
              { style: styles.row },
              createElement(Text, null, 'Commande associee'),
              createElement(
                Text,
                null,
                `#${watchFile.order.documentId.slice(-8).toUpperCase()}`
              )
            )
          : null
      ),
      createElement(
        View,
        { style: styles.footer },
        createElement(
          Text,
          { style: styles.footerText },
          'Document interne - Atelier horlogerie'
        ),
        createElement(Text, { style: styles.footerText }, 'Page 1')
      )
    ),
    createElement(
      Page,
      { size: 'A4', style: styles.page },
      createPdfTopBar(watchFile),
      createElement(
        Text,
        { style: styles.contentHeading },
        '1. IDENTIFICATION DE LA PIECE'
      ),
      createElement(View, { style: styles.contentDivider }),
      createElement(
        View,
        { style: styles.section },
        createElement(
          Text,
          { style: styles.subsectionTitle },
          '1.1 Description de la montre'
        ),
        createElement(
          View,
          { style: styles.identificationTable },
          ...identificationRows.map((row, index) =>
            createElement(
              View,
              {
                key: row[0],
                style: [
                  styles.identificationRow,
                  index === identificationRows.length - 1
                    ? styles.identificationRowLast
                    : null,
                ],
              },
              createElement(
                View,
                { style: styles.identificationLabel },
                createElement(
                  Text,
                  { style: styles.identificationLabelText },
                  row[0]
                )
              ),
              createElement(
                View,
                { style: styles.identificationValue },
                createElement(
                  Text,
                  { style: styles.identificationValueText },
                  row[1]
                )
              ),
              createElement(
                View,
                { style: styles.identificationLabel },
                createElement(
                  Text,
                  { style: styles.identificationLabelText },
                  row[2]
                )
              ),
              createElement(
                View,
                {
                  style: [
                    styles.identificationValue,
                    styles.identificationValueLast,
                  ],
                },
                createElement(
                  Text,
                  { style: styles.identificationValueText },
                  row[3]
                )
              )
            )
          )
        ),
        createElement(
          Text,
          { style: styles.subsectionTitle },
          "1.2 Notes d'identification"
        ),
        createElement(
          View,
          { style: styles.notesBox },
          createElement(Text, { style: styles.paragraph }, identificationNotes)
        )
      ),
      createElement(
        View,
        { style: styles.footer },
        createElement(
          Text,
          { style: styles.footerText },
          'Document interne - Atelier horlogerie'
        ),
        createElement(Text, { style: styles.footerText }, 'Page 2')
      )
    ),
    etatGeneralPage,
    operationsPage,
    qualityPage,
    validationPage,
    ...dossierBlockPages
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const jwt = await getStrapiSessionJwt()
  if (!jwt) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
  }

  const { id } = await params
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL

  if (!strapiUrl) {
    return NextResponse.json(
      { error: 'Configuration serveur manquante' },
      { status: 500 }
    )
  }

  const queryParams = new URLSearchParams()
  queryParams.set('populate[publicBeforeImage]', 'true')
  queryParams.set('populate[publicAfterImage]', 'true')
  queryParams.set('populate[order]', 'true')
  queryParams.set('populate[product][fields][0]', 'name')
  queryParams.set('populate[product][fields][1]', 'slug')
  queryParams.set('populate[customer]', 'true')
  queryParams.set('populate[etatGeneral][populate][0]', 'etatGeneralGlobal')
  queryParams.set(
    'populate[etatGeneral][populate][1]',
    'fonctionnementAvantIntervention'
  )
  queryParams.set('populate[etatGeneral][populate][2]', 'etatVisuelComposants')
  queryParams.set(
    'populate[operationsReparation][populate][0]',
    'operationsEffectuees'
  )
  queryParams.set(
    'populate[operationsReparation][populate][1]',
    'piecesRemplacees'
  )
  queryParams.set(
    'populate[controleQualiteMesures][populate][0]',
    'reglageEtPrecision'
  )
  queryParams.set(
    'populate[controleQualiteMesures][populate][1]',
    'testEtancheite'
  )
  queryParams.set('populate[validationAtelier][populate][0]', 'signature')
  appendWatchFileDossierBlocksPopulate(queryParams)

  const query =
    `${strapiUrl}/api/watch-files/${encodeURIComponent(id)}` +
    `?${queryParams.toString()}`

  const res = await fetch(query, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: 'no-store',
  })

  if (res.status === 401) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
  }

  if (res.status === 403) {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  if (!res.ok) {
    return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
  }

  const json = (await res.json()) as { data?: WatchFile }
  const watchFile = json.data
  if (!watchFile) {
    return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
  }

  try {
    const pdfDocument = createElement(WatchFileDocument, {
      watchFile,
    }) as unknown as ReactElement<DocumentProps>
    const buffer: Buffer = await renderToBuffer(pdfDocument)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="dossier-${watchFile.reference.toLowerCase()}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Watch file PDF generation failed', {
      watchFileId: watchFile.documentId,
      error,
    })
    return NextResponse.json(
      { error: 'Erreur de generation du dossier PDF' },
      { status: 500 }
    )
  }
}
