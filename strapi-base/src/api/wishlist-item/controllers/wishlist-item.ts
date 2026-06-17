/**
 * wishlist-item controller
 * Ownership enforced: chaque client ne voit que ses propres favoris
 */

import { factories } from '@strapi/strapi'

type UID = 'api::wishlist-item.wishlist-item'
const MODEL_UID: UID = 'api::wishlist-item.wishlist-item'

function getCustomerId(ctx: {
  state: { user?: { id?: number } | null }
  request: { header: Record<string, string | string[] | undefined> }
}) {
  const userId = ctx.state.user?.id
  if (typeof userId === 'number' && userId > 0) {
    return userId
  }

  const headerValue = ctx.request.header['x-hakuna-customer-id']
  const normalizedHeader = Array.isArray(headerValue)
    ? headerValue[0]
    : headerValue
  const parsed = Number.parseInt(normalizedHeader ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export default factories.createCoreController(MODEL_UID, ({ strapi }) => ({
  async find(ctx) {
    const customerId = getCustomerId(ctx)
    if (!customerId) {
      return ctx.unauthorized('Authentification requise')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries = await (strapi.documents(MODEL_UID) as any).findMany({
      filters: { customer: { id: { $eq: customerId } } },
      populate: {
        product: {
          populate: { images: true },
        },
      },
    })

    strapi.log.info(
      `[wishlist] find — customer.id=${customerId} count=${entries?.length ?? 0}`
    )

    return { data: entries, meta: {} }
  },

  async create(ctx) {
    const customerId = getCustomerId(ctx)
    if (!customerId) {
      return ctx.unauthorized('Authentification requise')
    }

    const body = ctx.request.body as { data?: { product?: string | number } }
    const productDocumentId = body?.data?.product
    if (!productDocumentId) return ctx.badRequest('product requis')

    // Check if already in wishlist (by product documentId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = strapi.documents(MODEL_UID) as any
    const existing = await svc.findMany({
      filters: {
        customer: { id: { $eq: customerId } },
        product: { documentId: { $eq: productDocumentId } },
      },
    })

    if (existing.length > 0) {
      strapi.log.info(
        `[wishlist] Already in favorites — customer.id=${customerId} product=${productDocumentId}`
      )
      return { data: existing[0] }
    }

    const entry = await svc.create({
      data: {
        customer: customerId,
        product: {
          connect: [{ documentId: String(productDocumentId) }],
        },
      },
      populate: {
        product: {
          populate: { images: true },
        },
      },
    })

    strapi.log.info(
      `[wishlist] Created — customer.id=${customerId} product=${productDocumentId} entry.documentId=${entry?.documentId}`
    )

    ctx.status = 201
    return { data: entry }
  },

  async delete(ctx) {
    const customerId = getCustomerId(ctx)
    if (!customerId) return ctx.unauthorized('Authentification requise')

    const { id } = ctx.params as { id: string }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = strapi.documents(MODEL_UID) as any
    const entry = await svc.findOne({
      documentId: id,
      populate: ['customer'],
    })

    if (!entry) return ctx.notFound('Favori introuvable')

    const entryCustomerId = (entry.customer as { id?: number } | null)?.id

    if (entryCustomerId !== customerId) {
      return ctx.forbidden('Accès refusé')
    }

    await svc.delete({ documentId: id })

    ctx.status = 204
    return null
  },
}))
