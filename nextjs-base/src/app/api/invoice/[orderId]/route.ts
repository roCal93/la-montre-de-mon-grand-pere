import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
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
import { formatPrice } from '@/lib/currency'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const runtime = 'nodejs'

interface LineItem {
  productName: string
  productSlug: string
  quantity: number
  unitPrice: number
  total: number
  description?: string
}

interface ShippingAddress {
  firstName: string
  lastName: string
  address1: string
  address2?: string
  city: string
  postalCode: string
  country: string
  phone?: string
}

interface Order {
  documentId: string
  order_status: string
  createdAt: string
  paidAt?: string
  customerEmail: string
  customerName: string
  lineItems: LineItem[]
  shippingAddress: ShippingAddress
  subtotal: number
  shippingCost: number
  total: number
}

interface InvoiceIssuer {
  name: string
  address: string
  siret: string
  ownerName: string
  legalStatus: string
  email: string
  website: string
  phone?: string
  vatNotice: string
}

class InvoiceIssuerConfigError extends Error {
  missing: string[]

  constructor(missing: string[]) {
    super('Invoice issuer configuration is missing')
    this.name = 'InvoiceIssuerConfigError'
    this.missing = missing
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

function toReadableCompanyName(value: string): string {
  const trimmed = value.trim()
  if (/^[a-z0-9]+(?:[-_][a-z0-9]+)+$/i.test(trimmed)) {
    return trimmed.replace(/[-_]+/g, ' ')
  }
  return trimmed
}

function getInvoiceIssuer(): InvoiceIssuer {
  const configuredCompanyName = process.env.COMPANY_NAME?.trim()
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME?.trim()
  const name = asText(
    configuredCompanyName
      ? toReadableCompanyName(configuredCompanyName)
      : siteName
        ? toReadableCompanyName(siteName)
        : '',
    'La Montre de Mon Grand-Père'
  )
  const address = process.env.COMPANY_ADDRESS?.trim() ?? ''
  const siret = process.env.COMPANY_SIRET?.trim() ?? ''
  const ownerName = asText(process.env.COMPANY_OWNER_NAME, 'Romain Calmelet')
  const legalStatus = asText(
    process.env.COMPANY_LEGAL_STATUS,
    'Auto-entrepreneur / Micro-entreprise'
  )
  const email = asText(
    process.env.COMPANY_EMAIL,
    'contact@lamontredemongrandpere.com'
  )
  const website = asText(
    process.env.COMPANY_WEBSITE,
    'www.lamontredemongrandpere.com'
  )
  const phone = asText(process.env.COMPANY_PHONE, '')
  const vatNotice = asText(
    process.env.COMPANY_VAT_NOTICE,
    'TVA non applicable, art. 293 B du CGI'
  )

  const missing: string[] = []
  if (!address) missing.push('COMPANY_ADDRESS')
  if (!siret) missing.push('COMPANY_SIRET')

  if (missing.length > 0) {
    throw new InvoiceIssuerConfigError(missing)
  }

  return {
    name,
    address,
    siret,
    ownerName,
    legalStatus,
    email,
    website,
    phone: phone || undefined,
    vatNotice,
  }
}

function getInvoiceNumber(order: Order): string {
  const createdAt = new Date(order.createdAt)
  const invoiceDate = Number.isNaN(createdAt.getTime()) ? new Date() : createdAt
  const datePart = invoiceDate.toISOString().slice(0, 10).replace(/-/g, '')
  const suffix = asText(order.documentId, 'INCONNU').slice(-8).toUpperCase()

  return `FAC-${datePart}-${suffix}`
}

function getInvoiceDate(order: Order): string {
  const createdAt = new Date(order.createdAt)
  const invoiceDate = Number.isNaN(createdAt.getTime()) ? new Date() : createdAt

  return invoiceDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getPaymentDate(order: Order): string {
  const sourceDate = order.paidAt || order.createdAt
  const parsed = new Date(sourceDate)
  const paymentDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed

  return paymentDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getPaymentMethodLabel(): string {
  return asText(
    process.env.COMPANY_PAYMENT_METHOD_LABEL,
    'Stripe (Carte bancaire)'
  )
}

function formatInternalReference(productSlug?: string): string {
  if (!productSlug) return ''
  const compact = productSlug.replace(/[^a-zA-Z0-9]+/g, '-').toUpperCase()
  if (!compact) return ''
  return `Référence interne : ${compact}`
}

function splitAddressLines(address: string): string[] {
  return address
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function getLogoMimeType(filePath: string): string | undefined {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.svg') return 'image/svg+xml'
  return undefined
}

async function getCompanyLogoDataUri(): Promise<string | undefined> {
  const configuredPath = process.env.COMPANY_LOGO_PATH?.trim()
  const candidates = [
    configuredPath,
    '/images/logo.png',
    '/images/logo.svg',
    '/images/hakuna-mataweb-logo.svg',
  ].filter((value): value is string =>
    Boolean(value && value.trim().length > 0)
  )

  for (const candidate of candidates) {
    const normalizedPath = candidate.startsWith('/')
      ? candidate
      : `/${candidate}`
    const publicRelativePath = normalizedPath.replace(/^\//, '')
    const absolutePath = path.join(process.cwd(), 'public', publicRelativePath)
    const mimeType = getLogoMimeType(normalizedPath)

    if (!mimeType) {
      continue
    }

    try {
      const fileBuffer = await readFile(absolutePath)
      return `data:${mimeType};base64,${fileBuffer.toString('base64')}`
    } catch {
      continue
    }
  }

  return undefined
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    paddingBottom: 28,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1c1917',
    backgroundColor: '#ffffff',
  },
  // ── Header ──────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexGrow: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  logo: {
    width: 280,
    height: 90,
    objectFit: 'contain',
    marginBottom: 6,
  },
  companyNameHeader: {
    fontSize: 13,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#111827',
    marginBottom: 3,
  },
  companySubHeader: {
    fontSize: 8,
    color: '#6b7280',
    width: 280,
    textAlign: 'center',
  },
  invoiceTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#111827',
    letterSpacing: 2,
    marginBottom: 6,
  },
  invoiceBadge: {
    backgroundColor: '#111827',
    color: '#ffffff',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 7.5,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  invoiceMeta: {
    fontSize: 8.2,
    color: '#6b7280',
    marginBottom: 2,
  },
  // ── Info cards ──────────────────────────────────────────
  infoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoCardLeft: {
    flexGrow: 1,
    flexBasis: 0,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 10,
  },
  infoCardRight: {
    flexGrow: 1,
    flexBasis: 0,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardLabel: {
    fontSize: 7.2,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  cardName: {
    fontSize: 10,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#111827',
    marginBottom: 3,
  },
  cardLine: {
    fontSize: 8.4,
    color: '#4b5563',
    marginBottom: 1.5,
    lineHeight: 1.35,
  },
  cardSubLabel: {
    fontSize: 7.2,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 7,
    marginBottom: 3,
  },
  // ── Table ───────────────────────────────────────────────
  sectionLabel: {
    fontSize: 7.2,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  table: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#111827',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  cellHeader: {
    paddingVertical: 7,
    paddingHorizontal: 9,
    fontSize: 7.5,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cell: {
    paddingVertical: 8,
    paddingHorizontal: 9,
    fontSize: 8.8,
    color: '#1f2937',
    lineHeight: 1.4,
  },
  cellDesignation: { flexGrow: 3, flexBasis: 0 },
  cellQuantity: { flexGrow: 0.7, flexBasis: 0, textAlign: 'center' },
  cellUnitPrice: { flexGrow: 1.2, flexBasis: 0, textAlign: 'right' },
  cellTotalCol: { flexGrow: 1.2, flexBasis: 0, textAlign: 'right' },
  // ── Totals ──────────────────────────────────────────────
  totalsWrapper: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  totalsBox: {
    width: 224,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  totalsLabel: {
    fontSize: 8.5,
    color: '#4b5563',
  },
  totalsValue: {
    fontSize: 8.5,
    color: '#1f2937',
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#111827',
  },
  totalLabelFinal: {
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  totalValueFinal: {
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#ffffff',
  },
  taxNote: {
    fontSize: 7.8,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginBottom: 14,
    textAlign: 'right',
  },
  // ── Footer ──────────────────────────────────────────────
  footer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerLeft: {
    fontSize: 7.5,
    color: '#9ca3af',
    lineHeight: 1.6,
  },
  footerRight: {
    fontSize: 7.5,
    color: '#9ca3af',
    textAlign: 'right',
  },
})

function InvoiceDocument({
  order,
  logoSrc,
}: {
  order: Order
  logoSrc?: string
}) {
  const issuer = getInvoiceIssuer()
  const invoiceNumber = getInvoiceNumber(order)
  const invoiceDate = getInvoiceDate(order)
  const paymentDate = getPaymentDate(order)
  const paymentMethod = getPaymentMethodLabel()
  const orderReference = asText(order.documentId, 'INCONNU')
    .slice(-8)
    .toUpperCase()
  const lineItems = Array.isArray(order.lineItems) ? order.lineItems : []
  const shippingAddress = order.shippingAddress ?? null
  const shippingFullName = shippingAddress
    ? `${asText(shippingAddress.firstName, '')} ${asText(shippingAddress.lastName, '')}`.trim()
    : ''
  const shippingPhone = asText(shippingAddress?.phone, '')
  const issuerAddressLines = splitAddressLines(issuer.address)

  return createElement(
    Document,
    null,
    createElement(
      Page,
      { size: 'A4', style: styles.page },

      // ── Header: logo à gauche, numéro/date à droite ──
      createElement(
        View,
        { style: styles.header },
        createElement(
          View,
          { style: styles.headerLeft },
          logoSrc
            ? createElement(Image, { src: logoSrc, style: styles.logo })
            : createElement(
                Text,
                { style: styles.companyNameHeader },
                issuer.name
              ),
          createElement(
            Text,
            { style: styles.companySubHeader },
            issuer.legalStatus
          )
        ),
        createElement(
          View,
          { style: styles.headerRight },
          createElement(Text, { style: styles.invoiceTitle }, 'FACTURE'),
          createElement(
            Text,
            { style: styles.invoiceBadge },
            `N° ${invoiceNumber}`
          ),
          createElement(
            Text,
            { style: styles.invoiceMeta },
            `Émise le ${invoiceDate}`
          ),
          createElement(
            Text,
            { style: styles.invoiceMeta },
            `Réf. commande : #${orderReference}`
          )
        )
      ),

      // ── Cartes DE / POUR ──
      createElement(
        View,
        { style: styles.infoRow },
        // Carte émetteur
        createElement(
          View,
          { style: styles.infoCardLeft },
          createElement(Text, { style: styles.cardLabel }, 'De'),
          createElement(Text, { style: styles.cardName }, issuer.name),
          createElement(
            Text,
            { style: styles.cardLine },
            `Responsable : ${issuer.ownerName}`
          ),
          ...issuerAddressLines.map((line, i) =>
            createElement(
              Text,
              { key: `il-${i}`, style: styles.cardLine },
              line
            )
          ),
          createElement(
            Text,
            { style: styles.cardLine },
            `SIRET : ${issuer.siret}`
          ),
          createElement(Text, { style: styles.cardLine }, issuer.email),
          createElement(Text, { style: styles.cardLine }, issuer.website),
          issuer.phone
            ? createElement(Text, { style: styles.cardLine }, issuer.phone)
            : null
        ),
        // Carte client
        createElement(
          View,
          { style: styles.infoCardRight },
          createElement(Text, { style: styles.cardLabel }, 'Pour'),
          createElement(
            Text,
            { style: styles.cardName },
            asText(order.customerName, 'Client')
          ),
          createElement(
            Text,
            { style: styles.cardLine },
            asText(order.customerEmail, '-')
          ),
          shippingPhone
            ? createElement(Text, { style: styles.cardLine }, shippingPhone)
            : null,
          shippingAddress
            ? createElement(
                Text,
                { style: styles.cardSubLabel },
                'Adresse de livraison'
              )
            : null,
          shippingAddress
            ? createElement(
                Text,
                { style: styles.cardLine },
                shippingFullName || 'Client'
              )
            : null,
          shippingAddress
            ? createElement(
                Text,
                { style: styles.cardLine },
                asText(shippingAddress.address1, '-')
              )
            : null,
          shippingAddress?.address2
            ? createElement(
                Text,
                { style: styles.cardLine },
                shippingAddress.address2
              )
            : null,
          shippingAddress
            ? createElement(
                Text,
                { style: styles.cardLine },
                `${asText(shippingAddress.postalCode, '')} ${asText(shippingAddress.city, '')} – ${asText(shippingAddress.country, 'FR')}`
              )
            : null
        )
      ),

      // ── Tableau des articles ──
      createElement(Text, { style: styles.sectionLabel }, 'Articles'),
      createElement(
        View,
        { style: styles.table },
        createElement(
          View,
          { style: styles.tableHeader },
          createElement(
            Text,
            { style: [styles.cellHeader, styles.cellDesignation] },
            'Désignation'
          ),
          createElement(
            Text,
            { style: [styles.cellHeader, styles.cellQuantity] },
            'Qté'
          ),
          createElement(
            Text,
            { style: [styles.cellHeader, styles.cellUnitPrice] },
            'P.U.'
          ),
          createElement(
            Text,
            { style: [styles.cellHeader, styles.cellTotalCol] },
            'Total'
          )
        ),
        ...lineItems.map((item, i) => {
          const isLast = i === lineItems.length - 1
          const baseRow = i % 2 === 1 ? styles.tableRowAlt : styles.tableRow
          const rowStyle = isLast ? [baseRow, styles.tableRowLast] : baseRow
          const ref = formatInternalReference(item.productSlug)
          const label = `${asText(item.productName, 'Montre')}${ref ? `\n${ref}` : ''}${item.description ? `\n${item.description}` : ''}`
          return createElement(
            View,
            { key: i, style: rowStyle },
            createElement(
              Text,
              { style: [styles.cell, styles.cellDesignation] },
              label
            ),
            createElement(
              Text,
              { style: [styles.cell, styles.cellQuantity] },
              String(Number(item.quantity) || 0)
            ),
            createElement(
              Text,
              { style: [styles.cell, styles.cellUnitPrice] },
              formatPrice(Number(item.unitPrice) || 0)
            ),
            createElement(
              Text,
              { style: [styles.cell, styles.cellTotalCol] },
              formatPrice(
                (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)
              )
            )
          )
        }),
        lineItems.length === 0
          ? createElement(
              View,
              { style: styles.tableRow },
              createElement(
                Text,
                { style: [styles.cell, styles.cellDesignation] },
                'Aucune ligne article disponible.'
              )
            )
          : null
      ),

      // ── Totaux (alignés à droite) ──
      createElement(
        View,
        { style: styles.totalsWrapper },
        createElement(
          View,
          { style: styles.totalsBox },
          createElement(
            View,
            { style: styles.totalsRow },
            createElement(Text, { style: styles.totalsLabel }, 'Sous-total'),
            createElement(
              Text,
              { style: styles.totalsValue },
              formatPrice(order.subtotal)
            )
          ),
          createElement(
            View,
            { style: styles.totalsRow },
            createElement(Text, { style: styles.totalsLabel }, 'Livraison'),
            createElement(
              Text,
              { style: styles.totalsValue },
              order.shippingCost === 0
                ? 'Offerte'
                : formatPrice(order.shippingCost)
            )
          ),
          createElement(
            View,
            { style: styles.totalRowFinal },
            createElement(Text, { style: styles.totalLabelFinal }, 'Total'),
            createElement(
              Text,
              { style: styles.totalValueFinal },
              formatPrice(order.total)
            )
          )
        )
      ),

      // Note TVA
      createElement(Text, { style: styles.taxNote }, issuer.vatNotice),

      // ── Footer ──
      createElement(
        View,
        { style: styles.footer },
        createElement(
          View,
          null,
          createElement(
            Text,
            { style: styles.footerLeft },
            `Paiement : ${paymentMethod}`
          ),
          createElement(
            Text,
            { style: styles.footerLeft },
            `Date de règlement : ${paymentDate}`
          )
        ),
        createElement(
          Text,
          { style: styles.footerRight },
          'Document généré automatiquement'
        )
      )
    )
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth()
  const sessionEmail = session?.user?.email?.trim().toLowerCase()
  if (!session || !sessionEmail) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { orderId } = await params
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL
  const token = process.env.STRAPI_API_TOKEN

  if (!strapiUrl || !token) {
    return NextResponse.json(
      { error: 'Configuration serveur manquante' },
      { status: 500 }
    )
  }

  const query =
    `${strapiUrl}/api/orders` +
    `?filters[documentId][$eq]=${encodeURIComponent(orderId)}` +
    `&filters[customerEmail][$eqi]=${encodeURIComponent(sessionEmail)}` +
    '&populate=*'

  const res = await fetch(query, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  }

  const json = (await res.json()) as { data?: Order[] }
  const order = json.data?.[0]
  if (!order) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const invoiceNumber = getInvoiceNumber(order)

  const PDF_TIMEOUT_MS = 25_000
  const PDF_TIMEOUT_ERROR = `PDF generation timed out after ${PDF_TIMEOUT_MS}ms`

  try {
    const logoSrc = await getCompanyLogoDataUri()
    const pdfDocument = createElement(InvoiceDocument, {
      order,
      logoSrc,
    }) as unknown as ReactElement<DocumentProps>

    const buffer: Buffer = await Promise.race([
      renderToBuffer(pdfDocument),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(PDF_TIMEOUT_ERROR)), PDF_TIMEOUT_MS)
      ),
    ])

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="facture-${invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Invoice PDF generation failed', {
      orderId: order.documentId,
      error,
    })

    if (error instanceof InvoiceIssuerConfigError) {
      return NextResponse.json(
        {
          error: 'Configuration facture manquante',
          missing: error.missing,
        },
        { status: 500 }
      )
    }

    if (error instanceof Error && error.message === PDF_TIMEOUT_ERROR) {
      return NextResponse.json(
        { error: 'La génération de la facture a expiré. Réessayez.' },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur de generation de facture' },
      { status: 500 }
    )
  }
}
