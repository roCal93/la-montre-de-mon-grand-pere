/**
 * Order lifecycles
 * After an order is created (via Stripe webhook), auto-assign the watch-file
 * linked to each purchased product to the buyer's Strapi user account.
 */

type WatchFileUID = 'api::watch-file.watch-file'
const WATCH_FILE_UID: WatchFileUID = 'api::watch-file.watch-file'

const RESEND_API_URL = 'https://api.resend.com/emails'

const ORDER_STATUS_LABELS: Record<string, string> = {
  commande_confirmee: 'Commande confirmee',
  en_preparation: 'En preparation',
  commande_expediee: 'Commande expediee',
  commande_terminee: 'Commande terminee',
}

const toText = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : fallback
  }
  if (typeof value === 'number') {
    return String(value)
  }
  return fallback
}

const SENDER_PLAIN_EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
const SENDER_NAMED_EMAIL_RE = /^.+<\s*[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+\s*>$/

const normalizeSenderFrom = (value: string): string => {
  const compact = value.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim()

  // Railway variables are sometimes pasted with wrapping quotes.
  const unquoted = compact.replace(/^['\"]+|['\"]+$/g, '').trim()

  if (SENDER_PLAIN_EMAIL_RE.test(unquoted) || SENDER_NAMED_EMAIL_RE.test(unquoted)) {
    return unquoted
  }

  // Fallback: support malformed "Name email@example.com" and normalize to
  // "Name <email@example.com>" (or plain email if no name is present).
  const emailMatch = unquoted.match(/([^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)/)
  if (!emailMatch) {
    return unquoted
  }

  const email = emailMatch[1]
  const name = unquoted.replace(email, '').trim()
  return name ? `${name} <${email}>` : email
}

const formatAmount = (amount: unknown, currency: unknown): string => {
  const numericAmount =
    typeof amount === 'number'
      ? amount
      : typeof amount === 'string'
        ? Number.parseFloat(amount)
        : NaN

  if (!Number.isFinite(numericAmount)) {
    return '-'
  }

  const currencyCode = toText(currency, 'EUR').toUpperCase()

  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currencyCode,
    }).format(numericAmount)
  } catch {
    return `${numericAmount.toFixed(2)} ${currencyCode}`
  }
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const statusLabel = (status: unknown): string => {
  const key = toText(status)
  return ORDER_STATUS_LABELS[key] ?? key
}

async function sendResendEmail(payload: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const rawFrom = process.env.ORDER_EMAIL_FROM
  const testRecipient = process.env.ORDER_EMAIL_TEST_RECIPIENT
  const from = rawFrom ? normalizeSenderFrom(rawFrom) : ''

  const missingEnv: string[] = []
  if (!apiKey) missingEnv.push('RESEND_API_KEY')
  if (!rawFrom) missingEnv.push('ORDER_EMAIL_FROM')

  if (missingEnv.length > 0) {
    strapi.log.warn(
      `[order lifecycle] Email skipped: missing environment variable(s): ${missingEnv.join(', ')}`
    )
    return
  }

  if (!SENDER_PLAIN_EMAIL_RE.test(from) && !SENDER_NAMED_EMAIL_RE.test(from)) {
    strapi.log.warn(
      '[order lifecycle] Email skipped: ORDER_EMAIL_FROM remains invalid after normalization. Expected "email@example.com" or "Name <email@example.com>"'
    )
    return
  }

  const usingResendOnboardingFrom = from
    .toLowerCase()
    .includes('onboarding@resend.dev')

  if (usingResendOnboardingFrom && !testRecipient) {
    strapi.log.warn(
      '[order lifecycle] Email skipped: ORDER_EMAIL_TEST_RECIPIENT is required when ORDER_EMAIL_FROM uses onboarding@resend.dev'
    )
    return
  }

  const recipient = testRecipient || payload.to

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [recipient],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Resend send failed (${response.status}): ${text}`)
  }
}

type OrderLineItem = {
  productName?: string
  quantity?: number
  total?: number
}

type LifecycleOrder = {
  documentId?: string
  customerEmail?: string
  customerName?: string
  order_status?: string
  total?: number
  currency?: string
  lineItems?: OrderLineItem[]
}

async function sendOrderConfirmationEmail(order: LifecycleOrder): Promise<void> {
  const to = toText(order.customerEmail)
  if (!to) return

  const ref = toText(order.documentId, 'INCONNUE').slice(-8).toUpperCase()
  const customerName = toText(order.customerName, 'Client')
  const total = formatAmount(order.total, order.currency)
  const status = statusLabel(order.order_status)
  const items = Array.isArray(order.lineItems) ? order.lineItems : []

  const linesHtml =
    items.length > 0
      ? `<ul>${items
          .map((item) => {
            const name = escapeHtml(toText(item.productName, 'Produit'))
            const qty = typeof item.quantity === 'number' ? item.quantity : 1
            return `<li>${name} x ${qty}</li>`
          })
          .join('')}</ul>`
      : '<p>Details disponibles dans votre espace client.</p>'

  const subject = `Commande confirmee #${ref}`
  const html = `
    <p>Bonjour ${escapeHtml(customerName)},</p>
    <p>Votre commande a bien ete enregistree.</p>
    <p><strong>Reference:</strong> #${escapeHtml(ref)}<br/>
    <strong>Statut:</strong> ${escapeHtml(status)}<br/>
    <strong>Total:</strong> ${escapeHtml(total)}</p>
    <p><strong>Articles:</strong></p>
    ${linesHtml}
    <p>Merci pour votre confiance,<br/>La Montre de Mon Grand-Pere</p>
  `
  const text = `Bonjour ${customerName},\n\nVotre commande a bien ete enregistree.\nReference: #${ref}\nStatut: ${status}\nTotal: ${total}\n\nMerci pour votre confiance.\nLa Montre de Mon Grand-Pere`

  await sendResendEmail({ to, subject, html, text })
}

async function sendOrderStatusChangedEmail(params: {
  order: LifecycleOrder
  previousStatus: string
}): Promise<void> {
  const to = toText(params.order.customerEmail)
  if (!to) return

  const ref = toText(params.order.documentId, 'INCONNUE').slice(-8).toUpperCase()
  const customerName = toText(params.order.customerName, 'Client')
  const prevLabel = statusLabel(params.previousStatus)
  const nextLabel = statusLabel(params.order.order_status)

  const subject = `Mise a jour commande #${ref}`
  const html = `
    <p>Bonjour ${escapeHtml(customerName)},</p>
    <p>Le statut de votre commande <strong>#${escapeHtml(ref)}</strong> a ete mis a jour.</p>
    <p><strong>Ancien statut:</strong> ${escapeHtml(prevLabel)}<br/>
    <strong>Nouveau statut:</strong> ${escapeHtml(nextLabel)}</p>
    <p>Merci,<br/>La Montre de Mon Grand-Pere</p>
  `
  const text = `Bonjour ${customerName},\n\nLe statut de votre commande #${ref} a ete mis a jour.\nAncien statut: ${prevLabel}\nNouveau statut: ${nextLabel}\n\nLa Montre de Mon Grand-Pere`

  await sendResendEmail({ to, subject, html, text })
}

export default {
  async beforeUpdate(event: {
    params: {
      where?: { documentId?: string; id?: number }
      data?: { order_status?: string }
    }
    state: Record<string, unknown>
  }) {
    try {
      const nextStatus = event.params?.data?.order_status
      const documentId = event.params?.where?.documentId
      const entityId = event.params?.where?.id

      if (!nextStatus) {
        return
      }

      let previousStatus: unknown

      if (documentId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const previousOrder = await (strapi.documents('api::order.order') as any).findOne({
          documentId,
          fields: ['order_status'],
        })
        previousStatus = previousOrder?.order_status
      } else if (typeof entityId === 'number') {
        const previousOrder = await strapi.db.query('api::order.order').findOne({
          where: { id: entityId },
          select: ['order_status'],
        })
        previousStatus = previousOrder?.order_status
      }

      event.state = event.state || {}
      event.state.previousOrderStatus = previousStatus
    } catch (err) {
      strapi.log.error('[order lifecycle] beforeUpdate error:', err)
    }
  },

  async afterCreate(event: {
    result: {
      documentId: string
      customerEmail?: string
      lineItems?: Array<{ productId?: string }>
    }
  }) {
    try {
      const { result } = event
      const orderDocumentId = result.documentId
      const customerEmail = result.customerEmail

      if (!customerEmail) return

      // Re-fetch the order with lineItems populated (components are not in event.result)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const order = await (strapi.documents('api::order.order') as any).findOne({
        documentId: orderDocumentId,
        fields: ['documentId', 'customerEmail', 'customerName', 'order_status', 'total', 'currency'],
        populate: ['lineItems', 'customer'],
      })
      const lineItems = (order?.lineItems ?? []) as Array<{ productId?: string }>

      try {
        await sendOrderConfirmationEmail({
          documentId: order?.documentId,
          customerEmail: order?.customerEmail,
          customerName: order?.customerName,
          order_status: order?.order_status,
          total: order?.total,
          currency: order?.currency,
          lineItems: order?.lineItems,
        })
      } catch (emailErr) {
        strapi.log.error('[order lifecycle] confirmation email error:', emailErr)
      }

      if (!lineItems.length) return

      // Find the buyer's Strapi user account by email
      const users = await strapi
        .query('plugin::users-permissions.user')
        .findMany({ where: { email: customerEmail }, limit: 1, select: ['id'] })
      const user = users[0] as { id: number } | undefined

      if (!user) {
        strapi.log.info(
          `[order lifecycle] No Strapi user for ${customerEmail} — watch-file not assigned`
        )
        return
      }

      // Ensure the order itself is linked to the buyer account (not just customerEmail).
      if (!order?.customer) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (strapi.documents('api::order.order') as any).update({
          documentId: orderDocumentId,
          data: { customer: user.id },
        })
      }

      // For each purchased product, find the linked watch-file and assign it to the buyer
      await Promise.all(
        lineItems.map(async (item) => {
          const numericId = parseInt(item.productId ?? '', 10)
          if (isNaN(numericId)) return

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const watchFiles = await (strapi.documents(WATCH_FILE_UID) as any).findMany({
            filters: { product: { id: { $eq: numericId } } },
            limit: 1,
          })
          const watchFile = watchFiles[0] as { documentId: string } | undefined

          if (!watchFile) {
            strapi.log.warn(
              `[order lifecycle] No watch-file found for product id=${numericId}`
            )
            return
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (strapi.documents(WATCH_FILE_UID) as any).update({
            documentId: watchFile.documentId,
            data: {
              customer: user.id,
              order: orderDocumentId,
            },
          })

          strapi.log.info(
            `[order lifecycle] Watch-file ${watchFile.documentId} assigned to user ${user.id} (${customerEmail})`
          )
        })
      )
    } catch (err) {
      // Never block order creation if watch-file assignment fails
      strapi.log.error('[order lifecycle] afterCreate error:', err)
    }
  },

  async afterUpdate(event: {
    params?: {
      data?: { order_status?: string }
    }
    result: {
      documentId?: string
      customerEmail?: string
      customerName?: string
      order_status?: string
    }
    state?: Record<string, unknown>
  }) {
    try {
      const previousStatus = toText(event.state?.previousOrderStatus)
      const nextStatus = toText(event.result?.order_status)
      const requestedStatus = toText(event.params?.data?.order_status)

      // Ignore updates that do not touch order_status.
      if (!requestedStatus) {
        return
      }

      if (!nextStatus || previousStatus === nextStatus) {
        return
      }

      await sendOrderStatusChangedEmail({
        order: {
          documentId: event.result.documentId,
          customerEmail: event.result.customerEmail,
          customerName: event.result.customerName,
          order_status: nextStatus,
        },
        previousStatus: previousStatus || 'inconnu',
      })
    } catch (err) {
      strapi.log.error('[order lifecycle] afterUpdate error:', err)
    }
  },
}
