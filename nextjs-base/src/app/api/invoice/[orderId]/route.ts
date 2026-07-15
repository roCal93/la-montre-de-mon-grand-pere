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

function getInvoiceIssuer(): InvoiceIssuer {
  const name = asText(
    process.env.COMPANY_NAME || process.env.NEXT_PUBLIC_SITE_NAME,
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
  const rawPath = asText(process.env.COMPANY_LOGO_PATH, '/images/logo.svg')
  const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`
  const publicRelativePath = normalizedPath.replace(/^\//, '')
  const absolutePath = path.join(process.cwd(), 'public', publicRelativePath)
  const mimeType = getLogoMimeType(normalizedPath)

  if (!mimeType) return undefined

  try {
    const fileBuffer = await readFile(absolutePath)
    return `data:${mimeType};base64,${fileBuffer.toString('base64')}`
  } catch {
    return undefined
  }
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1c1917',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: '#1f2937',
    paddingBottom: 12,
  },
  issuerBlock: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    backgroundColor: '#fafaf9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: {
    fontSize: 30,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    marginBottom: 2,
    color: '#111827',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 10,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: { marginBottom: 20 },
  columns: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  column: {
    flexGrow: 1,
    flexBasis: 0,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderRadius: 8,
    backgroundColor: '#fafaf9',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  columnLeft: {
    marginRight: 8,
  },
  columnRight: {
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    marginBottom: 9,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  issuerName: {
    fontSize: 12,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    marginBottom: 3,
    color: '#111827',
  },
  issuerLine: { fontSize: 9.5, color: '#374151', marginBottom: 2 },
  issuerSubLine: { fontSize: 9, color: '#6b7280', marginBottom: 2 },
  logo: {
    width: 180,
    height: 52,
    objectFit: 'contain',
    marginBottom: 8,
  },
  footerLogo: {
    width: 140,
    height: 40,
    objectFit: 'contain',
    marginBottom: 6,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  paymentInfo: {
    marginTop: 3,
    fontSize: 9,
    color: '#4b5563',
    lineHeight: 1.4,
  },
  bold: { fontFamily: 'Helvetica', fontWeight: 700 },
  infoText: { fontSize: 9.5, color: '#374151', lineHeight: 1.5 },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
    marginVertical: 10,
  },
  table: {
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  cell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 9.2,
    color: '#111827',
  },
  cellSubLine: {
    marginTop: 3,
    fontSize: 8.5,
    color: '#78716c',
  },
  cellHeader: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 9,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cellDesignation: { flexGrow: 3, flexBasis: 0 },
  cellQuantity: { flexGrow: 0.8, flexBasis: 0, textAlign: 'center' },
  cellUnitPrice: { flexGrow: 1, flexBasis: 0, textAlign: 'right' },
  cellTotal: { flexGrow: 1, flexBasis: 0, textAlign: 'right' },
  footerBlock: {
    marginTop: 26,
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    paddingTop: 12,
  },
  footerTitle: {
    fontSize: 10,
    color: '#111827',
    textAlign: 'center',
    fontFamily: 'Helvetica',
    fontWeight: 700,
    marginBottom: 3,
  },
  footerLine: {
    fontSize: 8.2,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    color: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 8.5,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  taxNote: {
    marginTop: 8,
    fontSize: 9.2,
    color: '#4b5563',
    fontStyle: 'italic',
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
    ? `${asText(shippingAddress.firstName, 'Client')} ${asText(shippingAddress.lastName, '')}`.trim()
    : ''
  const shippingPhone = asText(shippingAddress?.phone, '')
  const shippingAddressLines: ReactElement[] = []

  if (shippingAddress) {
    shippingAddressLines.push(
      createElement(Text, null, shippingFullName || 'Client')
    )
    shippingAddressLines.push(
      createElement(
        Text,
        null,
        asText(shippingAddress.address1, 'Adresse non fournie')
      )
    )
    if (shippingAddress.address2) {
      shippingAddressLines.push(
        createElement(Text, null, asText(shippingAddress.address2))
      )
    }
    shippingAddressLines.push(
      createElement(
        Text,
        null,
        `${asText(shippingAddress.postalCode, '00000')} ${asText(shippingAddress.city, 'Ville inconnue')} - ${asText(shippingAddress.country, 'FR')}`
      )
    )
    if (shippingPhone) {
      shippingAddressLines.push(
        createElement(Text, null, `Téléphone : ${shippingPhone}`)
      )
    }
  }

  const issuerAddressLines = splitAddressLines(issuer.address)

  return createElement(
    Document,
    null,
    createElement(
      Page,
      { size: 'A4', style: styles.page },
      createElement(
        View,
        { style: styles.header },
        createElement(Text, { style: styles.title }, 'Facture'),
        createElement(
          Text,
          { style: styles.subtitle },
          `Commande n° ${orderReference}`
        ),
        createElement(
          View,
          { style: styles.issuerBlock },
          logoSrc
            ? createElement(Image, { src: logoSrc, style: styles.logo })
            : createElement(Text, { style: styles.issuerName }, issuer.name),
          createElement(
            Text,
            { style: styles.issuerSubLine },
            issuer.legalStatus
          ),
          createElement(
            Text,
            { style: styles.issuerSubLine },
            `Responsable : ${issuer.ownerName}`
          ),
          ...issuerAddressLines.map((line, index) =>
            createElement(
              Text,
              { key: `issuer-line-${index}`, style: styles.issuerLine },
              line
            )
          ),
          createElement(
            Text,
            { style: styles.issuerLine },
            `SIRET : ${issuer.siret}`
          ),
          createElement(Text, { style: styles.issuerLine }, issuer.email),
          createElement(Text, { style: styles.issuerLine }, issuer.website),
          issuer.phone
            ? createElement(Text, { style: styles.issuerLine }, issuer.phone)
            : null
        )
      ),
      createElement(
        View,
        { style: styles.columns },
        createElement(
          View,
          { style: [styles.column, styles.columnLeft] },
          createElement(Text, { style: styles.sectionTitle }, 'Facture'),
          createElement(Text, { style: styles.badge }, `N° ${invoiceNumber}`),
          createElement(
            View,
            { style: styles.row },
            createElement(Text, null, 'Date'),
            createElement(Text, { style: styles.bold }, invoiceDate)
          ),
          createElement(
            View,
            { style: styles.row },
            createElement(Text, null, 'Référence commande'),
            createElement(Text, null, `#${orderReference}`)
          ),
          createElement(
            Text,
            { style: styles.paymentInfo },
            `Paiement : ${paymentMethod}`
          ),
          createElement(
            Text,
            { style: styles.paymentInfo },
            `Date de règlement : ${paymentDate}`
          )
        ),
        createElement(
          View,
          { style: [styles.column, styles.columnRight] },
          createElement(
            Text,
            { style: styles.sectionTitle },
            'Coordonnées du client'
          ),
          createElement(
            Text,
            { style: styles.infoText },
            `Nom : ${asText(order.customerName, 'Client')}`
          ),
          createElement(
            Text,
            { style: styles.infoText },
            `Email : ${asText(order.customerEmail, '-')}`
          ),
          shippingPhone
            ? createElement(
                Text,
                { style: styles.infoText },
                `Téléphone : ${shippingPhone}`
              )
            : null
        )
      ),
      createElement(View, { style: styles.divider }),
      createElement(
        View,
        { style: styles.section },
        createElement(
          Text,
          { style: styles.sectionTitle },
          'Désignation de la montre'
        ),
        createElement(
          View,
          { style: styles.table },
          createElement(
            View,
            { key: 'head', style: styles.tableHeader },
            createElement(
              Text,
              {
                key: 'designation',
                style: [styles.cellHeader, styles.cellDesignation],
              },
              'Désignation'
            ),
            createElement(
              Text,
              { key: 'qty', style: [styles.cellHeader, styles.cellQuantity] },
              'Qté'
            ),
            createElement(
              Text,
              { key: 'unit', style: [styles.cellHeader, styles.cellUnitPrice] },
              'Prix unitaire'
            ),
            createElement(
              Text,
              { key: 'total', style: [styles.cellHeader, styles.cellTotal] },
              'Prix'
            )
          ),
          ...lineItems.map((item, i) =>
            createElement(
              View,
              {
                key: i,
                style:
                  i === lineItems.length - 1
                    ? [styles.tableRow, styles.tableRowLast]
                    : styles.tableRow,
              },
              createElement(
                Text,
                { style: [styles.cell, styles.cellDesignation] },
                `${asText(item.productName, 'Montre')}${formatInternalReference(item.productSlug) ? `\n${formatInternalReference(item.productSlug)}` : ''}${item.description ? `\n${item.description}` : ''}`
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
                { style: [styles.cell, styles.cellTotal] },
                formatPrice(
                  (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)
                )
              )
            )
          )
        ),
        lineItems.length === 0
          ? createElement(
              Text,
              { style: styles.infoText },
              'Aucune ligne article disponible.'
            )
          : null
      ),
      createElement(View, { style: styles.divider }),
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, 'Totaux'),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, null, 'Sous-total'),
          createElement(Text, null, formatPrice(order.subtotal))
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, null, 'Livraison'),
          createElement(
            Text,
            null,
            order.shippingCost === 0
              ? 'Livraison offerte'
              : formatPrice(order.shippingCost)
          )
        ),
        createElement(View, { style: styles.divider }),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.bold }, 'Total'),
          createElement(Text, { style: styles.bold }, formatPrice(order.total))
        ),
        createElement(Text, { style: styles.taxNote }, issuer.vatNotice)
      ),
      shippingAddress
        ? createElement(
            View,
            { style: styles.section },
            createElement(
              Text,
              { style: styles.sectionTitle },
              'Adresse de livraison'
            ),
            ...shippingAddressLines
          )
        : null,
      createElement(
        View,
        { style: styles.footerBlock },
        logoSrc
          ? createElement(Image, { src: logoSrc, style: styles.footerLogo })
          : createElement(Text, { style: styles.footerTitle }, issuer.name),
        createElement(Text, { style: styles.footerLine }, issuer.legalStatus),
        createElement(
          Text,
          { style: styles.footerLine },
          `SIRET : ${issuer.siret}`
        ),
        createElement(Text, { style: styles.footerLine }, issuer.website),
        createElement(Text, { style: styles.footerLine }, issuer.email),
        issuer.phone
          ? createElement(Text, { style: styles.footerLine }, issuer.phone)
          : null,
        createElement(Text, { style: styles.footerLine }, issuer.vatNotice)
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
