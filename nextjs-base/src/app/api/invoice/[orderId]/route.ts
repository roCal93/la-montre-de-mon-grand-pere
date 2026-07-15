import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  Document,
  type DocumentProps,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'
import { createElement, type ReactElement } from 'react'
import { formatPrice } from '@/lib/currency'

export const runtime = 'nodejs'

interface LineItem {
  productName: string
  productSlug: string
  quantity: number
  unitPrice: number
  total: number
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

  if (!address || !siret) {
    throw new Error('Invoice issuer configuration is missing')
  }

  return { name, address, siret }
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

function splitAddressLines(address: string): string[] {
  return address
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1c1917',
  },
  header: { marginBottom: 32 },
  issuerBlock: { marginBottom: 16 },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: { fontSize: 10, color: '#78716c' },
  section: { marginBottom: 20 },
  columns: {
    flexDirection: 'row',
    gap: 16,
  },
  column: {
    flexGrow: 1,
    flexBasis: 0,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    marginBottom: 8,
    color: '#44403c',
  },
  issuerName: {
    fontSize: 11,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    marginBottom: 3,
  },
  issuerLine: { fontSize: 10, color: '#57534e', marginBottom: 2 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  bold: { fontFamily: 'Helvetica', fontWeight: 700 },
  infoText: { fontSize: 10, color: '#57534e', lineHeight: 1.5 },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
    marginVertical: 12,
  },
  table: {
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f4',
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  cell: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 9.5,
    color: '#1c1917',
  },
  cellHeader: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 9,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#44403c',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cellDesignation: { flexGrow: 3, flexBasis: 0 },
  cellQuantity: { flexGrow: 0.8, flexBasis: 0, textAlign: 'center' },
  cellUnitPrice: { flexGrow: 1, flexBasis: 0, textAlign: 'right' },
  cellTotal: { flexGrow: 1, flexBasis: 0, textAlign: 'right' },
  footer: { marginTop: 40, fontSize: 8, color: '#a8a29e', textAlign: 'center' },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f5f5f4',
    color: '#57534e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 9,
    marginBottom: 12,
  },
  taxNote: {
    marginTop: 8,
    fontSize: 10,
    color: '#44403c',
    fontStyle: 'italic',
  },
})

function InvoiceDocument({ order }: { order: Order }) {
  const issuer = getInvoiceIssuer()
  const invoiceNumber = getInvoiceNumber(order)
  const invoiceDate = getInvoiceDate(order)
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
        createElement(
          View,
          { style: styles.issuerBlock },
          createElement(Text, { style: styles.issuerName }, issuer.name),
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
          )
        ),
        createElement(
          Text,
          { style: styles.title },
          'Facture / Bon de commande'
        ),
        createElement(
          Text,
          { style: styles.subtitle },
          'Document commercial généré automatiquement'
        )
      ),
      createElement(
        View,
        { style: styles.columns },
        createElement(
          View,
          { style: styles.column },
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
          )
        ),
        createElement(
          View,
          { style: styles.column },
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
                asText(item.productName, 'Montre')
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
              ? 'Offerte'
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
        createElement(
          Text,
          { style: styles.taxNote },
          'TVA non applicable, art. 293 B du CGI'
        )
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
        Text,
        { style: styles.footer },
        'La Montre de Mon Grand-Père — Document généré automatiquement'
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
    const pdfDocument = createElement(InvoiceDocument, {
      order,
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

    if (
      error instanceof Error &&
      error.message === 'Invoice issuer configuration is missing'
    ) {
      return NextResponse.json(
        { error: 'Configuration facture manquante' },
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
