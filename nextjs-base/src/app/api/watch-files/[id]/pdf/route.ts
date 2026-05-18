import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
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
import {
  getCurrentStrapiUser,
  getStrapiSessionJwt,
} from '@/lib/strapi-session-cookie'
import { cleanImageUrl } from '@/lib/strapi'
import {
  appendWatchFileDossierBlocksPopulate,
  extractPlainTextFromStrapiBlocks,
  getWatchFileDossierBlockAnchor,
  getWatchFileDossierBlockKey,
  type WatchFileBeforeAfterDossierBlock,
  type WatchFileDossierBlock,
  type WatchFileImageDossierBlock,
  type WatchFileRichTextDossierBlock,
  type WatchFileTextImageDossierBlock,
  type WatchFileAudioDossierBlock,
  type WatchFileVideoDossierBlock,
  type WatchFileBlockMedia,
} from '@/lib/watch-file-dossier-blocks'
import QRCode from 'qrcode'
import sharp from 'sharp'

export const runtime = 'nodejs'

interface MediaFile {
  url: string
  alternativeText?: string
  mime?: string | null
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
  customer?: { id: number } | null
  order?: { documentId: string; createdAt: string }
  product?: {
    name: string
    slug?: string
    images?: MediaFile[] | null
  }
}

interface DossierMediaQrCode {
  href: string
  dataUrl: string
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

function stripHtml(html?: string | null): string {
  if (!html) return ''

  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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
    { label: 'Boitier', item: globalState.boitier },
    { label: 'Cadran', item: globalState.cadran },
    { label: 'Mouvement', item: globalState.mouvement },
    { label: 'Bracelet', item: globalState.bracelet },
  ]
    .map(({ label, item }) => {
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
  dossierMediaQrRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  dossierMediaQrImage: {
    width: 78,
    height: 78,
    borderWidth: 1,
    borderColor: '#d8d2c6',
    backgroundColor: '#ffffff',
    padding: 3,
  },
  dossierMediaQrTextWrap: {
    flex: 1,
  },
  dossierMediaNoticeEyebrow: {
    fontSize: 7,
    color: '#8f6f1c',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  dossierMediaQrTitle: {
    fontSize: 10,
    color: '#223f63',
    fontFamily: 'Helvetica',
    fontWeight: 700,
  },
  dossierMediaQrHint: {
    marginTop: 6,
    fontSize: 8,
    lineHeight: 1.45,
    color: '#6b6258',
  },
  topBarRight: {
    fontSize: 7,
    color: '#7c8792',
  },
  hero: {
    marginTop: 16,
    marginBottom: 22,
    alignItems: 'stretch',
  },
  overviewIntroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 22,
    marginBottom: 28,
  },
  overviewIntroText: {
    flex: 1,
    minHeight: 280,
    justifyContent: 'flex-start',
  },
  overviewIntroImage: {
    width: 244,
  },
  overviewIntroLabel: {
    fontSize: 8,
    color: '#8f6f1c',
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    marginBottom: 12,
  },
  coverReference: {
    marginTop: 2,
    fontSize: 10,
    color: '#5d6a77',
    letterSpacing: 0.6,
  },
  coverMetaCard: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#d5dbe2',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  coverMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e7eb',
  },
  coverMetaRowLast: {
    borderBottomWidth: 0,
  },
  coverMetaLabel: {
    fontSize: 8,
    color: '#5d6a77',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  coverMetaValue: {
    fontSize: 10,
    color: '#1c1917',
    fontFamily: 'Helvetica',
    fontWeight: 700,
  },
  overviewSummary: {
    marginTop: 14,
    fontSize: 10,
    lineHeight: 1.62,
    color: '#292524',
  },
  overviewHistoryBlock: {
    marginTop: 24,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#d5dbe2',
  },
  heroImageWrap: {
    width: '100%',
    alignSelf: 'flex-start',
    padding: 6,
    borderWidth: 1,
    borderColor: '#d8d2c6',
    backgroundColor: '#f1ede4',
  },
  heroImageInnerFrame: {
    width: '100%',
    padding: 8,
    borderWidth: 1,
    borderColor: '#ece6da',
    backgroundColor: '#fbfaf7',
  },
  heroImage: {
    width: '100%',
    height: 292,
    objectFit: 'cover',
  },
  heroLineOne: {
    fontSize: 10,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    letterSpacing: 2.4,
    color: '#8f6f1c',
    textAlign: 'left',
    textTransform: 'uppercase',
  },
  heroLineTwo: {
    marginTop: 10,
    fontSize: 30,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    letterSpacing: 0.8,
    color: '#223f63',
    textAlign: 'left',
  },
  heroDivider: {
    marginTop: 14,
    width: 88,
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
    width: 116,
    backgroundColor: '#f5f5f4',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: '#c6ccd3',
    justifyContent: 'center',
  },
  dossierLabelText: {
    fontSize: 8,
    color: '#5d6a77',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  dossierValueCell: {
    flex: 1,
    backgroundColor: '#eef2f6',
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  dossierValueText: {
    fontSize: 10,
    color: '#1c1917',
    fontFamily: 'Helvetica',
    fontWeight: 700,
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
  technicalLead: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d5dbe2',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  technicalLeadIndex: {
    width: 40,
    fontSize: 8,
    color: '#8f6f1c',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingTop: 2,
  },
  technicalLeadBody: {
    flex: 1,
  },
  technicalLeadTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#223f63',
  },
  technicalLeadText: {
    marginTop: 4,
    fontSize: 9,
    lineHeight: 1.45,
    color: '#4b5563',
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
    fontSize: 15,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#223f63',
    marginBottom: 6,
  },
  dossierBlockSection: {
    marginBottom: 14,
  },
  dossierBlockSectionLast: {
    marginBottom: 0,
  },
  dossierBlockText: {
    fontSize: 9.2,
    lineHeight: 1.45,
    color: '#292524',
  },
  dossierColumns: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  dossierTextColumn: {
    flex: 1.15,
  },
  dossierImageColumn: {
    flex: 0.85,
  },
  dossierStackedContent: {
    marginTop: 10,
  },
  dossierColumn: {
    flex: 1,
  },
  dossierImageFrame: {
    borderWidth: 1,
    borderColor: '#d5dbe2',
    padding: 4,
    backgroundColor: '#f8fafc',
  },
  dossierImage: {
    width: '100%',
    height: 205,
    objectFit: 'cover',
  },
  dossierImageCaption: {
    marginTop: 4,
    fontSize: 7,
    color: '#5d6a77',
    textTransform: 'uppercase',
  },
  dossierMediaNotice: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#d5dbe2',
    backgroundColor: '#faf8f2',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dossierMediaNoticeText: {
    fontSize: 9,
    lineHeight: 1.45,
    color: '#3f3a35',
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stateCard: {
    borderWidth: 1,
    borderColor: '#d5dbe2',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 2,
  },
  stateLabel: {
    width: 84,
    fontSize: 10,
    color: '#5d6a77',
    textTransform: 'uppercase',
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
    borderRightColor: '#000000',
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
  validationSignoffGrid: {
    marginTop: 26,
    flexDirection: 'row',
    gap: 24,
  },
  validationSignoffCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d5dbe2',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  validationSignoffColumn: {
    flex: 1,
  },
  validationSignoffLabel: {
    fontSize: 8,
    color: '#5d6a77',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  validationSignoffLine: {
    marginTop: 8,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1917',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  validationSignatureImage: {
    maxWidth: 160,
    maxHeight: 44,
    objectFit: 'contain',
  },
  validationDateText: {
    fontSize: 10,
    color: '#292524',
  },
})

function buildPdfMediaUrl(url?: string | null) {
  if (!url) return undefined
  // Already resolved (data URI) — pass through without URL parsing
  if (url.startsWith('data:')) return url
  return cleanImageUrl(url) ?? undefined
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

const pdfMediaConversionCache = new Map<string, Promise<string | undefined>>()

const LOCAL_STRAPI_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

function getPdfMediaExtension(url: string) {
  try {
    const pathname = new URL(url).pathname
    const extension = pathname.split('.').pop()?.toLowerCase()
    return extension ?? null
  } catch {
    return url.split('?')[0].split('.').pop()?.toLowerCase() ?? null
  }
}

function shouldConvertPdfMedia(url: string, mime?: string | null) {
  const lowerMime = mime?.toLowerCase() ?? ''
  const extension = getPdfMediaExtension(url)

  return (
    lowerMime.includes('gif') ||
    lowerMime.includes('webp') ||
    lowerMime.includes('svg') ||
    extension === 'gif' ||
    extension === 'webp' ||
    extension === 'svg'
  )
}

function getPdfMediaMimeType(url: string, mime?: string | null) {
  if (mime?.trim()) return mime

  const extension = getPdfMediaExtension(url)
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
  if (extension === 'png') return 'image/png'
  if (extension === 'webp') return 'image/webp'
  if (extension === 'gif') return 'image/gif'
  if (extension === 'svg') return 'image/svg+xml'

  return 'application/octet-stream'
}

function getLocalStrapiMediaPath(sourceUrl: string) {
  try {
    const parsedUrl = new URL(sourceUrl)
    if (!LOCAL_STRAPI_HOSTS.has(parsedUrl.hostname)) return null
    if (!parsedUrl.pathname.startsWith('/uploads/')) return null

    const relativePath = parsedUrl.pathname.replace(/^\//, '')
    return path.resolve(process.cwd(), '../strapi-base/public', relativePath)
  } catch {
    return null
  }
}

async function resolveLocalPdfMediaUrl(
  sourceUrl: string,
  mime?: string | null
) {
  const localPath = getLocalStrapiMediaPath(sourceUrl)
  if (!localPath) return null

  try {
    const inputBuffer = await readFile(localPath)

    if (shouldConvertPdfMedia(sourceUrl, mime)) {
      const outputBuffer = await sharp(inputBuffer, { animated: true })
        .png()
        .toBuffer()

      return toDataUrl(outputBuffer, 'image/png')
    }

    return toDataUrl(inputBuffer, getPdfMediaMimeType(sourceUrl, mime))
  } catch (error) {
    console.warn('Local PDF media read failed', {
      sourceUrl,
      localPath,
      error,
    })
    return null
  }
}

function toDataUrl(buffer: Buffer, mime: string) {
  return `data:${mime};base64,${buffer.toString('base64')}`
}

async function resolvePdfMediaUrl(url?: string | null, mime?: string | null) {
  const sourceUrl = buildPdfMediaUrl(url)
  if (!sourceUrl) return undefined
  // Already a data URI — nothing to do
  if (sourceUrl.startsWith('data:')) return sourceUrl

  const cacheKey = sourceUrl
  const cached = pdfMediaConversionCache.get(cacheKey)
  if (cached !== undefined) return cached

  const resolutionPromise = (async () => {
    // 1. Try local filesystem (dev: Strapi uploads directory)
    const localResolvedUrl = await resolveLocalPdfMediaUrl(sourceUrl, mime)
    if (localResolvedUrl) return localResolvedUrl

    // 2. Fetch and embed as data URI so react-pdf never has to make HTTP calls
    //    (react-pdf's internal HTTP client can silently fail on localhost URLs)
    try {
      const response = await fetch(sourceUrl, { cache: 'no-store' })
      if (!response.ok) {
        console.warn('[pdf] media fetch failed', {
          sourceUrl,
          status: response.status,
        })
        return sourceUrl
      }
      const inputBuffer = Buffer.from(await response.arrayBuffer())
      const effectiveMime =
        mime?.trim() ||
        response.headers.get('content-type')?.split(';')[0].trim() ||
        getPdfMediaMimeType(sourceUrl, null)

      if (shouldConvertPdfMedia(sourceUrl, effectiveMime)) {
        const outputBuffer = await sharp(inputBuffer, { animated: true })
          .png()
          .toBuffer()
        return toDataUrl(outputBuffer, 'image/png')
      }

      return toDataUrl(inputBuffer, effectiveMime)
    } catch (error) {
      console.warn('[pdf] media resolution failed', { sourceUrl, error })
      return sourceUrl
    }
  })()

  pdfMediaConversionCache.set(cacheKey, resolutionPromise)
  return resolutionPromise
}

async function normalizePdfMediaFile<
  T extends { url: string; mime?: string | null },
>(media: T | null | undefined): Promise<T | null | undefined> {
  if (!media?.url) return media

  const resolvedUrl = await resolvePdfMediaUrl(media.url, media.mime)
  if (!resolvedUrl || resolvedUrl === media.url) return media

  return {
    ...media,
    url: resolvedUrl,
  }
}

async function normalizePdfMediaArray<
  T extends { url: string; mime?: string | null },
>(medias?: T[] | null) {
  if (!medias?.length) return medias ?? null

  return Promise.all(
    medias.map(async (media) => (await normalizePdfMediaFile(media)) ?? media)
  )
}

async function normalizeWatchFileBlockForPdf(block: WatchFileDossierBlock) {
  if (block.__component === 'watch-file.image-block') {
    return {
      ...block,
      image: (await normalizePdfMediaFile(block.image)) ?? block.image,
    } satisfies WatchFileImageDossierBlock
  }

  if (block.__component === 'watch-file.text-image-block') {
    return {
      ...block,
      images: await normalizePdfMediaArray(block.images),
    } satisfies WatchFileTextImageDossierBlock
  }

  if (block.__component === 'watch-file.before-after-block') {
    return {
      ...block,
      pairs: await Promise.all(
        block.pairs.map(async (pair) => ({
          ...pair,
          beforeImage:
            (await normalizePdfMediaFile(pair.beforeImage)) ?? pair.beforeImage,
          afterImage:
            (await normalizePdfMediaFile(pair.afterImage)) ?? pair.afterImage,
        }))
      ),
    } satisfies WatchFileBeforeAfterDossierBlock
  }

  if (block.__component === 'watch-file.video-block') {
    return block
  }

  if (block.__component === 'watch-file.audio-block') {
    return block
  }

  return block
}

async function normalizeWatchFileForPdf(
  watchFile: WatchFile
): Promise<WatchFile> {
  return {
    ...watchFile,
    publicBeforeImage:
      (await normalizePdfMediaArray(watchFile.publicBeforeImage)) ??
      watchFile.publicBeforeImage,
    publicAfterImage:
      (await normalizePdfMediaArray(watchFile.publicAfterImage)) ??
      watchFile.publicAfterImage,
    product: watchFile.product
      ? {
          ...watchFile.product,
          images: await normalizePdfMediaArray(watchFile.product.images),
        }
      : watchFile.product,
    validationAtelier: watchFile.validationAtelier
      ? {
          ...watchFile.validationAtelier,
          signature:
            (await normalizePdfMediaFile(
              watchFile.validationAtelier.signature
            )) ?? watchFile.validationAtelier.signature,
        }
      : watchFile.validationAtelier,
    dossierBlocks: watchFile.dossierBlocks
      ? await Promise.all(
          watchFile.dossierBlocks.map((block) =>
            normalizeWatchFileBlockForPdf(block)
          )
        )
      : watchFile.dossierBlocks,
  }
}

function getDossierBlockWeight(block: WatchFileDossierBlock) {
  if (
    block.__component === 'watch-file.image-block' ||
    block.__component === 'watch-file.text-image-block' ||
    block.__component === 'watch-file.before-after-block'
  ) {
    return 2
  }

  return 1
}

function groupDossierBlocks(blocks: WatchFileDossierBlock[]) {
  const pages: WatchFileDossierBlock[][] = []
  let currentPage: WatchFileDossierBlock[] = []
  let currentWeight = 0

  for (const block of blocks) {
    const weight = getDossierBlockWeight(block)
    if (currentPage.length > 0 && currentWeight + weight > 3) {
      pages.push(currentPage)
      currentPage = []
      currentWeight = 0
    }

    currentPage.push(block)
    currentWeight += weight
  }

  if (currentPage.length > 0) {
    pages.push(currentPage)
  }

  return pages
}

function renderDossierBlockContent(
  block: WatchFileDossierBlock,
  title: string
) {
  if (block.__component === 'watch-file.rich-text-block') {
    return renderPdfRichTextBlockContent(block, title)
  }

  if (block.__component === 'watch-file.image-block') {
    return renderPdfImageBlockContent(block, title)
  }

  if (block.__component === 'watch-file.text-image-block') {
    return renderPdfTextImageBlockContent(block, title)
  }

  if (block.__component === 'watch-file.before-after-block') {
    return renderPdfBeforeAfterBlockContent(block, title)
  }

  if (block.__component === 'watch-file.video-block') {
    return renderPdfMediaBlockContent(block, title, 'video')
  }

  if (block.__component === 'watch-file.audio-block') {
    return renderPdfMediaBlockContent(block, title, 'audio')
  }

  return null
}

function renderPdfRichTextBlockContent(
  block: WatchFileRichTextDossierBlock,
  title: string
) {
  const text = extractPlainTextFromStrapiBlocks(block.content)
  if (!text) return null

  return createElement(
    View,
    { style: styles.dossierBlockSection, wrap: false },
    createElement(Text, { style: styles.dossierBlockTitle }, title),
    createElement(Text, { style: styles.dossierBlockText }, text)
  )
}

function renderPdfImageBlockContent(
  block: WatchFileImageDossierBlock,
  title: string
) {
  const imageUrl = buildPdfMediaUrl(block.image?.url)
  if (!imageUrl) return null

  return createElement(
    View,
    { style: styles.dossierBlockSection, wrap: false },
    createElement(Text, { style: styles.dossierBlockTitle }, title),
    createElement(
      View,
      { style: styles.dossierImageFrame },
      createElement(Image, {
        src: imageUrl,
        style: styles.dossierImage,
      })
    )
  )
}

function renderPdfTextImageBlockContent(
  block: WatchFileTextImageDossierBlock,
  title: string
) {
  const text = extractPlainTextFromStrapiBlocks(block.content)
  const images = (block.images ?? [])
    .map((image) => {
      const url = buildPdfMediaUrl(image?.url)

      if (!url) return null

      return {
        url,
        caption:
          image?.caption?.trim() || image?.alternativeText?.trim() || null,
      }
    })
    .filter((image): image is { url: string; caption: string | null } =>
      Boolean(image?.url)
    )

  if (!text && images.length === 0) return null

  // Grille d'images partagée (rangées de 2)
  const imageGrid = images.length
    ? chunkArray(images, 2).map((row, rowIndex) =>
        createElement(
          View,
          {
            key: `row-${rowIndex}`,
            style:
              rowIndex === 0
                ? styles.dossierColumns
                : [styles.dossierColumns, { marginTop: 10 }],
          },
          ...row.map((image, imageIndex) =>
            createElement(
              View,
              {
                key: `${image.url}-${imageIndex}`,
                style: styles.dossierColumn,
              },
              createElement(
                View,
                { style: styles.dossierImageFrame },
                createElement(Image, {
                  src: image.url,
                  style: styles.dossierImage,
                })
              ),
              image.caption
                ? createElement(
                    Text,
                    { style: styles.dossierImageCaption },
                    image.caption
                  )
                : null
            )
          )
        )
      )
    : null

  // Chemin 2 colonnes : texte + 1 image côte à côte
  if (text && images.length <= 1) {
    const textColumn = createElement(
      View,
      { style: styles.dossierTextColumn },
      createElement(Text, { style: styles.dossierBlockText }, text)
    )
    const imageColumn = imageGrid
      ? createElement(View, { style: styles.dossierImageColumn }, ...imageGrid)
      : null

    return createElement(
      View,
      { style: styles.dossierBlockSection, wrap: false },
      createElement(Text, { style: styles.dossierBlockTitle }, title),
      createElement(
        View,
        { style: styles.dossierColumns },
        block.imagePosition === 'left'
          ? [imageColumn, textColumn]
          : [textColumn, imageColumn]
      )
    )
  }

  // Chemin empilé : blocs pleine largeur (pas de flex-shrink)
  const textBlock = text
    ? createElement(
        View,
        null,
        createElement(Text, { style: styles.dossierBlockText }, text)
      )
    : null

  const imageBlock = imageGrid ? createElement(View, null, ...imageGrid) : null

  const stackedParts =
    block.imagePosition === 'left'
      ? [imageBlock, textBlock]
      : [textBlock, imageBlock]

  return createElement(
    View,
    { style: styles.dossierBlockSection, wrap: false },
    createElement(Text, { style: styles.dossierBlockTitle }, title),
    ...stackedParts.filter(Boolean).map((content, index) =>
      createElement(
        View,
        {
          key: `stacked-${index}`,
          style: index === 0 ? undefined : styles.dossierStackedContent,
        },
        content
      )
    )
  )
}

function renderPdfBeforeAfterBlockContent(
  block: WatchFileBeforeAfterDossierBlock,
  title: string
) {
  const text = extractPlainTextFromStrapiBlocks(block.content)
  const validPairs = (block.pairs ?? [])
    .map((pair) => ({
      label: pair.label?.trim() || null,
      beforeUrl: buildPdfMediaUrl(pair.beforeImage?.url),
      afterUrl: buildPdfMediaUrl(pair.afterImage?.url),
    }))
    .filter(
      (
        pair
      ): pair is {
        label: string | null
        beforeUrl: string
        afterUrl: string
      } => Boolean(pair.beforeUrl && pair.afterUrl)
    )

  if (validPairs.length === 0) return null

  return createElement(
    View,
    { style: styles.dossierBlockSection, wrap: false },
    createElement(Text, { style: styles.dossierBlockTitle }, title),
    text
      ? createElement(
          Text,
          { style: [styles.dossierBlockText, { fontStyle: 'italic' }] },
          text
        )
      : null,
    ...validPairs.map((pair, index) =>
      createElement(
        View,
        {
          key: `${pair.beforeUrl}-${pair.afterUrl}-${index}`,
          style:
            index === 0
              ? text
                ? [{ marginTop: 10 }]
                : undefined
              : [{ marginTop: 10 }],
        },
        pair.label
          ? createElement(
              Text,
              { style: styles.dossierImageCaption },
              pair.label
            )
          : null,
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
                src: pair.beforeUrl,
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
                src: pair.afterUrl,
                style: styles.dossierImage,
              })
            ),
            createElement(Text, { style: styles.dossierImageCaption }, 'Après')
          )
        )
      )
    )
  )
}

function renderPdfMediaBlockContent(
  block: WatchFileVideoDossierBlock | WatchFileAudioDossierBlock,
  title: string,
  mediaType: 'video' | 'audio',
  qrCode?: DossierMediaQrCode
) {
  const text = extractPlainTextFromStrapiBlocks(block.content)
  const media =
    block.__component === 'watch-file.video-block' ? block.video : block.audio

  if (!text && !media?.url && !title) return null

  return createElement(
    View,
    { style: styles.dossierBlockSection, wrap: false },
    createElement(Text, { style: styles.dossierBlockTitle }, title),
    text ? createElement(Text, { style: styles.dossierBlockText }, text) : null,
    createElement(
      View,
      { style: styles.dossierMediaNotice },
      qrCode
        ? createElement(
            View,
            null,
            createElement(
              Text,
              { style: styles.dossierMediaNoticeEyebrow },
              'Accès média'
            ),
            createElement(
              View,
              { style: styles.dossierMediaQrRow },
              createElement(Image, {
                src: qrCode.dataUrl,
                style: styles.dossierMediaQrImage,
              }),
              createElement(
                View,
                { style: styles.dossierMediaQrTextWrap },
                createElement(
                  Text,
                  { style: styles.dossierMediaQrTitle },
                  mediaType === 'video'
                    ? 'Consultation vidéo'
                    : 'Consultation sonore'
                ),
                createElement(
                  Text,
                  { style: styles.dossierMediaNoticeText },
                  mediaType === 'video'
                    ? 'Le média complet est accessible depuis le dossier web sécurisé.'
                    : "L'enregistrement complet est accessible depuis le dossier web sécurisé."
                ),
                createElement(
                  Text,
                  { style: styles.dossierMediaQrHint },
                  'Scannez pour ouvrir directement le contenu associé.'
                )
              )
            )
          )
        : createElement(
            Text,
            { style: styles.dossierMediaNoticeText },
            mediaType === 'video'
              ? "Vidéo consultable depuis l'espace client en ligne."
              : "Audio consultable depuis l'espace client en ligne."
          )
    )
  )
}

function buildWatchFileWebUrl(watchFile: WatchFile, anchor: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return `${siteUrl}/fr/espace-client/mes-montres/${watchFile.documentId}#${anchor}`
}

async function buildDossierMediaQrCodes(watchFile: WatchFile) {
  const entries = await Promise.all(
    (watchFile.dossierBlocks ?? []).map(async (block, index) => {
      if (
        block.__component !== 'watch-file.video-block' &&
        block.__component !== 'watch-file.audio-block'
      ) {
        return null
      }

      const media =
        block.__component === 'watch-file.video-block'
          ? block.video
          : block.audio
      if (!media?.url) return null

      const key = getWatchFileDossierBlockKey(block, index)
      const anchor = getWatchFileDossierBlockAnchor(block, index)
      const href = buildWatchFileWebUrl(watchFile, anchor)
      const dataUrl = await QRCode.toDataURL(href, {
        margin: 1,
        width: 144,
        errorCorrectionLevel: 'M',
      })

      return [key, { href, dataUrl }] as const
    })
  )

  return Object.fromEntries(
    entries.filter(Boolean) as Array<readonly [string, DossierMediaQrCode]>
  )
}

function renderDossierBlockContentWithQr(
  block: WatchFileDossierBlock,
  title: string,
  qrCodes: Record<string, DossierMediaQrCode>,
  blockIndex: number
) {
  if (block.__component === 'watch-file.video-block') {
    return renderPdfMediaBlockContent(
      block,
      title,
      'video',
      qrCodes[getWatchFileDossierBlockKey(block, blockIndex)]
    )
  }

  if (block.__component === 'watch-file.audio-block') {
    return renderPdfMediaBlockContent(
      block,
      title,
      'audio',
      qrCodes[getWatchFileDossierBlockKey(block, blockIndex)]
    )
  }

  return renderDossierBlockContent(block, title)
}

function renderDossierBlocksPage(
  watchFile: WatchFile,
  blocks: WatchFileDossierBlock[],
  pageNumber: number,
  pageIndex: number,
  qrCodes: Record<string, DossierMediaQrCode>,
  allBlocks: WatchFileDossierBlock[]
) {
  const contents = blocks
    .map((block, index) => {
      const originalIndex = allBlocks.indexOf(block)
      const title =
        block.title?.trim() || `Dossier visuel ${pageIndex + index + 1}`
      const rendered = renderDossierBlockContentWithQr(
        block,
        title,
        qrCodes,
        originalIndex === -1 ? pageIndex + index : originalIndex
      )
      if (!rendered) return null

      const isLast = index === blocks.length - 1
      return createElement(
        View,
        {
          key: `${block.__component}-${block.id ?? `${pageIndex}-${index}`}`,
          style: isLast
            ? [styles.dossierBlockSection, styles.dossierBlockSectionLast]
            : styles.dossierBlockSection,
          wrap: false,
        },
        rendered.props.children
      )
    })
    .filter(Boolean)

  if (contents.length === 0) return null

  return createElement(
    Page,
    { size: 'A4', style: styles.page, key: `dossier-page-${pageNumber}` },
    createPdfTopBar(watchFile),
    createElement(
      Text,
      { style: styles.contentHeading },
      '7. DOSSIER COMPLÉMENTAIRE'
    ),
    createElement(View, { style: styles.contentDivider }),
    ...contents,
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
      'Dossier de réparation horlogère - atelier'
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
      'Document interne - Atelier d’horlogerie'
    ),
    createElement(Text, { style: styles.footerText }, `Page ${pageNumber}`)
  )
}

function renderPoint1OverviewPage(watchFile: WatchFile, pageNumber: number) {
  const productName = asText(watchFile.product?.name, 'Montre ancienne')
  const publicSummary = normalizeText(watchFile.marketingShortDescription, '')
  const publicHistory = stripHtml(watchFile.marketingDescription)
  const productHeroImageUrl = buildPdfMediaUrl(
    watchFile.product?.images?.[0]?.url
  )
  const dossierRows = [
    ['Référence dossier', asText(watchFile.reference)],
    ['Horloger responsable', 'Romain Calmelet'],
    ['Date de réception', formatDate(watchFile.dateReception)],
    ['Date de mise en vente', formatDate(watchFile.dateMiseEnVente)],
  ] as const

  return createElement(
    Page,
    { size: 'A4', style: styles.page, key: 'overview-page' },
    createPdfTopBar(watchFile),
    createElement(
      View,
      { style: styles.hero },
      createElement(Text, { style: styles.heroLineOne }, 'Dossier atelier'),
      createElement(
        Text,
        { style: styles.heroLineTwo },
        'Dossier de réparation horlogère'
      ),
      createElement(View, { style: styles.heroDivider })
    ),
    createElement(
      View,
      { style: styles.overviewIntroRow },
      createElement(
        View,
        { style: styles.overviewIntroText },
        createElement(
          Text,
          { style: styles.overviewIntroLabel },
          'Montre documentée'
        ),
        createElement(Text, { style: styles.contentHeading }, productName),
        createElement(
          Text,
          { style: styles.coverReference },
          `Référence dossier ${asText(watchFile.reference).toUpperCase()}`
        ),
        publicSummary
          ? createElement(
              Text,
              { style: styles.overviewSummary },
              publicSummary
            )
          : null,
        createElement(
          View,
          { style: styles.coverMetaCard },
          ...dossierRows.map(([label, value], index) =>
            createElement(
              View,
              {
                key: label,
                style:
                  index === dossierRows.length - 1
                    ? [styles.coverMetaRow, styles.coverMetaRowLast]
                    : styles.coverMetaRow,
              },
              createElement(Text, { style: styles.coverMetaLabel }, label),
              createElement(Text, { style: styles.coverMetaValue }, value)
            )
          )
        )
      ),
      productHeroImageUrl
        ? createElement(
            View,
            { style: styles.overviewIntroImage },
            createElement(
              View,
              { style: styles.heroImageWrap },
              createElement(
                View,
                { style: styles.heroImageInnerFrame },
                createElement(Image, {
                  src: productHeroImageUrl,
                  style: styles.heroImage,
                })
              )
            )
          )
        : null
    ),
    publicHistory
      ? createElement(
          View,
          { style: styles.overviewHistoryBlock },
          createElement(Text, { style: styles.sectionTitle }, '1. Histoire'),
          createElement(Text, { style: styles.paragraph }, publicHistory)
        )
      : null,
    createPdfFooter(pageNumber)
  )
}

function renderPoint3IdentificationPage(
  watchFile: WatchFile,
  pageNumber: number
) {
  const identificationRows = [
    [
      'Marque',
      asText(watchFile.marque, '-'),
      'Modèle',
      asText(watchFile.modele ?? watchFile.product?.name, '-'),
    ],
    [
      'Référence',
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
      'Année estimée',
      asText(watchFile.anneeEstimee, '-'),
      'Matière du boîtier',
      asText(watchFile.matiereBoitier, '-'),
    ],
    [
      'Diamètre boîtier',
      asText(watchFile.diametreBoitier, '-'),
      'Epaisseur',
      asText(watchFile.epaisseur, '-'),
    ],
    [
      'Bracelet / matière',
      asText(watchFile.matiereBracelet, '-'),
      'Boucle',
      asText(watchFile.boucle, '-'),
    ],
    [
      'Verre',
      asText(watchFile.verre, '-'),
      'Étanchéité annoncée',
      asText(watchFile.etancheiteAnnoncee, '-'),
    ],
  ] as const

  const identificationNotes =
    stripHtml(
      watchFile.notesIdentification ??
        watchFile.marketingShortDescription ??
        undefined
    ) || 'À compléter'

  return createElement(
    Page,
    { size: 'A4', style: styles.page, key: 'identification-page' },
    createPdfTopBar(watchFile),
    createElement(
      Text,
      { style: styles.contentHeading },
      '3. IDENTIFICATION DE LA MONTRE'
    ),
    createElement(View, { style: styles.contentDivider }),
    createElement(
      View,
      { style: styles.technicalLead },
      createElement(Text, { style: styles.technicalLeadIndex }, 'Point 3'),
      createElement(
        View,
        { style: styles.technicalLeadBody },
        createElement(
          Text,
          { style: styles.technicalLeadTitle },
          "Base d'identification et caractéristiques observées"
        ),
        createElement(
          Text,
          { style: styles.technicalLeadText },
          "Cette page rassemble les informations d'identification, les principales caractéristiques visibles et les notes utiles à la lecture technique du dossier."
        )
      )
    ),
    createElement(
      View,
      { style: styles.section },
      createElement(
        Text,
        { style: styles.subsectionTitle },
        '3.1 Description de la montre'
      ),
      createElement(
        View,
        { style: styles.identificationTable },
        ...identificationRows.map((row, index) =>
          createElement(
            View,
            {
              key: row[0],
              style:
                index === identificationRows.length - 1
                  ? [styles.identificationRow, styles.identificationRowLast]
                  : styles.identificationRow,
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
        "3.2 Notes d'identification"
      ),
      createElement(
        View,
        { style: styles.notesBox },
        createElement(Text, { style: styles.paragraph }, identificationNotes)
      )
    ),
    createPdfFooter(pageNumber)
  )
}

function renderPoint4EtatPage(watchFile: WatchFile, pageNumber: number) {
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
      '4. ÉTAT À LA RÉCEPTION'
    ),
    createElement(View, { style: styles.contentDivider }),
    createElement(
      View,
      { style: styles.technicalLead },
      createElement(Text, { style: styles.technicalLeadIndex }, 'Point 4'),
      createElement(
        View,
        { style: styles.technicalLeadBody },
        createElement(
          Text,
          { style: styles.technicalLeadTitle },
          "Constat d'état avant intervention"
        ),
        createElement(
          Text,
          { style: styles.technicalLeadText },
          "Le relevé ci-dessous résume l'état fonctionnel et visuel de la montre à son arrivée, avant toute opération d'atelier."
        )
      )
    ),
    globalRows.length > 0
      ? createElement(
          View,
          { style: styles.section },
          createElement(
            Text,
            { style: styles.subsectionTitle },
            "4.0 Résumé d'état"
          ),
          createElement(
            View,
            { style: styles.stateCard },
            ...globalRows.map((row) =>
              createElement(
                View,
                { key: row.label, style: styles.stateRow },
                createElement(Text, { style: styles.stateLabel }, row.label),
                createElement(
                  View,
                  { style: styles.stateBarTrack },
                  createElement(View, {
                    style: [
                      styles.stateBarFill,
                      { width: `${row.percentage}%` },
                    ],
                  })
                ),
                createElement(Text, { style: styles.stateComment }, row.comment)
              )
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
            '4.1 Fonctionnement avant intervention'
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
            '4.2 État visuel des composants'
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
    createPdfFooter(pageNumber)
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
      '5. OPÉRATIONS DE RÉPARATION'
    ),
    createElement(View, { style: styles.contentDivider }),
    createElement(
      View,
      { style: styles.technicalLead },
      createElement(Text, { style: styles.technicalLeadIndex }, 'Point 5'),
      createElement(
        View,
        { style: styles.technicalLeadBody },
        createElement(
          Text,
          { style: styles.technicalLeadTitle },
          'Interventions menées en atelier'
        ),
        createElement(
          Text,
          { style: styles.technicalLeadText },
          'Cette page détaille les opérations effectuées, les choix de remise en état et les pièces remplacées le cas échéant.'
        )
      )
    ),
    publicSummary
      ? createElement(
          View,
          { style: styles.section },
          createElement(
            Text,
            { style: styles.subsectionTitle },
            '5.0 Synthèse des interventions'
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
            '5.1 Opérations effectuées'
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
                  'Opération'
                )
              ),
              createElement(
                View,
                { style: [styles.detailHeaderCell, { width: '16%' }] },
                createElement(
                  Text,
                  { style: styles.detailHeaderText },
                  'Réalisée'
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
            '5.2 Pièces remplacées'
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
                  'Désignation'
                )
              ),
              createElement(
                View,
                { style: [styles.detailHeaderCell, { width: '22%' }] },
                createElement(
                  Text,
                  { style: styles.detailHeaderText },
                  'Référence / calibre'
                )
              ),
              createElement(
                View,
                { style: [styles.detailHeaderCell, { width: '10%' }] },
                createElement(Text, { style: styles.detailHeaderText }, 'Qté')
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
                createElement(Text, { style: styles.detailHeaderText }, 'État')
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
  const timingHeaderCells: Array<[string, string]> = [
    ['Position', '28%'],
    ['Rate', '12%'],
    ['Amplitude', '14%'],
    ['Beat error', '16%'],
    ['Fréquence', '12%'],
    ['Résultat', '18%'],
  ]
  const waterResistanceHeaderCells: Array<[string, string]> = [
    ['Test', '34%'],
    ['Valeur / résultat', '26%'],
    ['Observations', '40%'],
  ]
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
      '6. CONTRÔLE QUALITÉ & MESURES'
    ),
    createElement(View, { style: styles.contentDivider }),
    createElement(
      View,
      { style: styles.technicalLead },
      createElement(Text, { style: styles.technicalLeadIndex }, 'Point 6'),
      createElement(
        View,
        { style: styles.technicalLeadBody },
        createElement(
          Text,
          { style: styles.technicalLeadTitle },
          'Mesures, essais et validation technique'
        ),
        createElement(
          Text,
          { style: styles.technicalLeadText },
          'Les relevés suivants documentent les contrôles de marche, les tests complémentaires et les conclusions retenues pour la remise de la montre.'
        )
      )
    ),
    timingRows.length > 0
      ? createElement(
          View,
          { style: styles.section },
          createElement(
            Text,
            { style: styles.subsectionTitle },
            '6.1 Réglage et précision du mouvement'
          ),
          createElement(
            View,
            { style: styles.detailTable },
            createElement(
              View,
              { style: styles.detailHeader },
              ...timingHeaderCells.map(([label, width], index, array) =>
                createElement(
                  View,
                  {
                    key: label,
                    style:
                      index === array.length - 1
                        ? [
                            styles.detailHeaderCell,
                            styles.detailHeaderCellLast,
                            { width },
                          ]
                        : [styles.detailHeaderCell, { width }],
                  },
                  createElement(Text, { style: styles.detailHeaderText }, label)
                )
              )
            ),
            ...timingRows.map((row, index) =>
              (() => {
                const timingCells: Array<[string | null | undefined, string]> =
                  [
                    [row.position, '28%'],
                    [row.rate, '12%'],
                    [row.amplitude, '14%'],
                    [row.beatError, '16%'],
                    [row.frequence, '12%'],
                    [row.resultat, '18%'],
                  ]

                return createElement(
                  View,
                  { key: `${row.position}-${index}`, style: styles.detailRow },
                  ...timingCells.map(([value, width], cellIndex, array) =>
                    createElement(
                      View,
                      {
                        key: `${cellIndex}`,
                        style:
                          cellIndex === array.length - 1
                            ? [
                                styles.detailCell,
                                styles.detailCellLast,
                                { width },
                              ]
                            : [styles.detailCell, { width }],
                      },
                      createElement(
                        Text,
                        { style: styles.detailCellText },
                        normalizeText(value, '-')
                      )
                    )
                  )
                )
              })()
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
            "6.2 Test d'étanchéité et contrôle"
          ),
          createElement(
            View,
            { style: styles.detailTable },
            createElement(
              View,
              { style: styles.detailHeader },
              ...waterResistanceHeaderCells.map(
                ([label, width], index, array) =>
                  createElement(
                    View,
                    {
                      key: label,
                      style:
                        index === array.length - 1
                          ? [
                              styles.detailHeaderCell,
                              styles.detailHeaderCellLast,
                              { width },
                            ]
                          : [styles.detailHeaderCell, { width }],
                    },
                    createElement(
                      Text,
                      { style: styles.detailHeaderText },
                      label
                    )
                  )
              )
            ),
            ...waterResistanceRows.map((row, index) =>
              (() => {
                const waterResistanceCells: Array<
                  [string | null | undefined, string]
                > = [
                  [row.test, '34%'],
                  [row.valeurResultat, '26%'],
                  [row.observations, '40%'],
                ]

                return createElement(
                  View,
                  { key: `${row.test}-${index}`, style: styles.detailRow },
                  ...waterResistanceCells.map(
                    ([value, width], cellIndex, array) =>
                      createElement(
                        View,
                        {
                          key: `${cellIndex}`,
                          style:
                            cellIndex === array.length - 1
                              ? [
                                  styles.detailCell,
                                  styles.detailCellLast,
                                  { width },
                                ]
                              : [styles.detailCell, { width }],
                        },
                        createElement(
                          Text,
                          { style: styles.detailCellText },
                          normalizeText(value, '-')
                        )
                      )
                  )
                )
              })()
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
            '6.3 Observations & conclusions'
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

function renderOrderSection(watchFile: WatchFile) {
  if (!watchFile.order) return null

  return createElement(
    View,
    { style: [styles.section, { marginTop: 28 }] },
    createElement(
      Text,
      { style: styles.contentHeading },
      '9. COMMANDE ASSOCIÉE'
    ),
    createElement(View, { style: styles.contentDivider }),
    createElement(
      View,
      { style: styles.section },
      createElement(
        View,
        { style: styles.dossierTable },
        createElement(
          View,
          { style: [styles.dossierRow, styles.dossierRowLast] },
          createElement(
            View,
            { style: styles.dossierLabelCell },
            createElement(Text, { style: styles.dossierLabelText }, 'Commande')
          ),
          createElement(
            View,
            { style: styles.dossierValueCell },
            createElement(
              Text,
              { style: styles.dossierValueText },
              `#${watchFile.order.documentId.slice(-8).toUpperCase()}`
            )
          )
        )
      )
    )
  )
}

function renderPoint5ValidationPage(
  watchFile: WatchFile,
  pageNumber: number,
  includeOrderSection = false
) {
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
      '8. VALIDATION ATELIER'
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
      { style: [styles.section, styles.validationSignoffGrid] },
      createElement(
        View,
        {
          style: [styles.validationSignoffColumn, styles.validationSignoffCard],
        },
        createElement(
          Text,
          { style: styles.validationSignoffLabel },
          'Signature'
        ),
        createElement(
          View,
          { style: styles.validationSignoffLine },
          validationAtelier?.signature?.url
            ? createElement(Image, {
                src:
                  cleanImageUrl(validationAtelier.signature.url) ??
                  validationAtelier.signature.url,
                style: styles.validationSignatureImage,
              })
            : null
        )
      ),
      createElement(
        View,
        {
          style: [styles.validationSignoffColumn, styles.validationSignoffCard],
        },
        createElement(Text, { style: styles.validationSignoffLabel }, 'Date'),
        createElement(
          View,
          { style: styles.validationSignoffLine },
          createElement(
            Text,
            { style: styles.validationDateText },
            validationAtelier?.dateSignature
              ? formatDate(validationAtelier.dateSignature)
              : ' '
          )
        )
      )
    ),
    includeOrderSection ? renderOrderSection(watchFile) : null,
    createPdfFooter(pageNumber)
  )
}

function WatchFileDocument({
  watchFile,
  dossierMediaQrCodes,
}: {
  watchFile: WatchFile
  dossierMediaQrCodes: Record<string, DossierMediaQrCode>
}) {
  const pages: ReactElement[] = []
  let pageNumber = 1

  pages.push(renderPoint1OverviewPage(watchFile, pageNumber))
  pageNumber += 1

  pages.push(renderPoint3IdentificationPage(watchFile, pageNumber))
  pageNumber += 1

  const etatGeneralPage = renderPoint4EtatPage(watchFile, pageNumber)
  if (etatGeneralPage) {
    pages.push(etatGeneralPage)
    pageNumber += 1
  }

  const operationsPage = renderPoint3OperationsPage(watchFile, pageNumber)
  if (operationsPage) {
    pages.push(operationsPage)
    pageNumber += 1
  }

  const qualityPage = renderPoint4QualityPage(watchFile, pageNumber)
  if (qualityPage) {
    pages.push(qualityPage)
    pageNumber += 1
  }

  const dossierBlockGroups = groupDossierBlocks(watchFile.dossierBlocks ?? [])
  for (let index = 0; index < dossierBlockGroups.length; index += 1) {
    const blockGroup = dossierBlockGroups[index]
    const renderedGroupPage = renderDossierBlocksPage(
      watchFile,
      blockGroup,
      pageNumber,
      index * 2,
      dossierMediaQrCodes,
      watchFile.dossierBlocks ?? []
    )
    if (renderedGroupPage) {
      pages.push(renderedGroupPage)
      pageNumber += 1
    }
  }

  const validationPage = renderPoint5ValidationPage(
    watchFile,
    pageNumber,
    Boolean(watchFile.order)
  )
  if (validationPage) {
    pages.push(validationPage)
    pageNumber += 1
  }

  if (watchFile.order && !validationPage) {
    pages.push(
      createElement(
        Page,
        { size: 'A4', style: styles.page, key: 'order-page' },
        createPdfTopBar(watchFile),
        renderOrderSection(watchFile),
        createPdfFooter(pageNumber)
      )
    )
  }

  return createElement(Document, null, ...pages)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const jwt = await getStrapiSessionJwt()
  const strapiUser = await getCurrentStrapiUser()
  if (!jwt) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
  }
  if (!strapiUser) {
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
  queryParams.set('populate[product][populate][images][fields][0]', 'url')
  queryParams.set(
    'populate[product][populate][images][fields][1]',
    'alternativeText'
  )
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
  if (watchFile.customer?.id !== strapiUser.id) {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  try {
    const normalizedWatchFile = await normalizeWatchFileForPdf(watchFile)
    const dossierMediaQrCodes =
      await buildDossierMediaQrCodes(normalizedWatchFile)
    const pdfDocument = createElement(WatchFileDocument, {
      watchFile: normalizedWatchFile,
      dossierMediaQrCodes,
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
