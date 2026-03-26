import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { formatPrice } from '@/lib/currency'

export const dynamic = 'force-dynamic'

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
  status: string
  createdAt: string
  customerEmail: string
  customerName: string
  lineItems: LineItem[]
  shippingAddress: ShippingAddress
  subtotal: number
  shippingCost: number
  total: number
}

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: 'Helvetica', fontSize: 10, color: '#1c1917' },
  header: { marginBottom: 32 },
  title: { fontSize: 22, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#78716c' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 8, color: '#44403c' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  bold: { fontFamily: 'Helvetica-Bold' },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e7e5e4', marginVertical: 12 },
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
})

function InvoiceDocument({ order }: { order: Order }) {
  const refNum = order.documentId.slice(-8).toUpperCase()
  const date = new Date(order.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return createElement(
    Document,
    null,
    createElement(
      Page,
      { size: 'A4', style: styles.page },
      // Header
      createElement(
        View,
        { style: styles.header },
        createElement(Text, { style: styles.title }, 'La Montre de Mon Grand-Père'),
        createElement(Text, { style: styles.subtitle }, 'Facture / Bon de commande')
      ),
      // Meta
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.badge }, `Statut : ${order.status.toUpperCase()}`),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, null, `Référence : #${refNum}`),
          createElement(Text, null, `Date : ${date}`)
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, null, `Client : ${order.customerName}`),
          createElement(Text, null, order.customerEmail)
        )
      ),
      // Divider
      createElement(View, { style: styles.divider }),
      // Line items
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, 'Articles'),
        ...(order.lineItems ?? []).map((item, i) =>
          createElement(
            View,
            { key: i, style: styles.row },
            createElement(Text, null, `${item.productName}  ×${item.quantity}`),
            createElement(Text, { style: styles.bold }, formatPrice(item.unitPrice * item.quantity))
          )
        )
      ),
      // Divider
      createElement(View, { style: styles.divider }),
      // Totals
      createElement(
        View,
        { style: styles.section },
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
            order.shippingCost === 0 ? 'Offerte' : formatPrice(order.shippingCost)
          )
        ),
        createElement(View, { style: styles.divider }),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.bold }, 'Total'),
          createElement(Text, { style: styles.bold }, formatPrice(order.total))
        )
      ),
      // Shipping address
      order.shippingAddress &&
        createElement(
          View,
          { style: styles.section },
          createElement(Text, { style: styles.sectionTitle }, 'Adresse de livraison'),
          createElement(Text, null, `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`),
          createElement(Text, null, order.shippingAddress.address1),
          order.shippingAddress.address2 && createElement(Text, null, order.shippingAddress.address2),
          createElement(
            Text,
            null,
            `${order.shippingAddress.postalCode} ${order.shippingAddress.city} — ${order.shippingAddress.country}`
          )
        ),
      // Footer
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
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { orderId } = await params
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL
  const token = process.env.STRAPI_API_TOKEN

  const res = await fetch(
    `${strapiUrl}/api/orders/${orderId}?populate=*`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!res.ok) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  }

  const json = (await res.json()) as { data: Order }
  const order = json.data

  // IDOR check: only the owner can download their invoice
  if (order.customerEmail.toLowerCase() !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer: Buffer = await renderToBuffer(createElement(InvoiceDocument as any, { order }) as any)

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="facture-${order.documentId.slice(-8).toUpperCase()}.pdf"`,
    },
  })
}
