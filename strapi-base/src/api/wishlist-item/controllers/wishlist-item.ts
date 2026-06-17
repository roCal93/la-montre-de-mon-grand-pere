/**
 * wishlist-item controller
 * Ownership enforced: chaque client ne voit que ses propres favoris
 */

import { factories } from '@strapi/strapi'

type UID = 'api::wishlist-item.wishlist-item'
const MODEL_UID: UID = 'api::wishlist-item.wishlist-item'

type AuthUser = {
  id?: number
  documentId?: string
} | null

function buildCustomerFilters(user: AuthUser) {
  const filters: Array<Record<string, unknown>> = []

  if (typeof user?.id === 'number') {
    filters.push({ customer: { id: { $eq: user.id } } })
  }

  if (typeof user?.documentId === 'string' && user.documentId.trim()) {
    filters.push({ customer: { documentId: { $eq: user.documentId } } })
  }

  return filters
}

export default factories.createCoreController(MODEL_UID, ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.user as AuthUser
    if (!user) return ctx.unauthorized('Authentification requise')

    const customerFilters = buildCustomerFilters(user)
    if (customerFilters.length === 0) {
      return ctx.unauthorized('Authentification requise')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries = await (strapi.documents(MODEL_UID) as any).findMany({
      filters: { $or: customerFilters },
      populate: {
        product: {
          populate: { images: true },
        },
      },
    })

    strapi.log.info(
      `[wishlist] find — user.id=${user?.id} count=${entries?.length ?? 0}`
    )

    return { data: entries, meta: {} }
  },

  async create(ctx) {
    const user = ctx.state.user as AuthUser
    if (!user) return ctx.unauthorized('Authentification requise')

    const customerFilters = buildCustomerFilters(user)
    if (customerFilters.length === 0) {
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
        $or: customerFilters,
        product: { documentId: { $eq: productDocumentId } },
      },
    })

    if (existing.length > 0) {
      strapi.log.info(
        `[wishlist] Already in favorites — user.id=${user?.id} product=${productDocumentId}`
      )
      return { data: existing[0] }
    }

    const entry = await svc.create({
      data: {
        customer: user.id,
        product: productDocumentId,
      },
      populate: {
        product: {
          populate: { images: true },
        },
      },
    })

    strapi.log.info(
      `[wishlist] Created — user.id=${user?.id} product=${productDocumentId} entry.documentId=${entry?.documentId}`
    )

    ctx.status = 201
    return { data: entry }
  },

  async delete(ctx) {
    const user = ctx.state.user as AuthUser
    if (!user) return ctx.unauthorized('Authentification requise')

    const { id } = ctx.params as { id: string }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = strapi.documents(MODEL_UID) as any
    const entry = await svc.findOne({
      documentId: id,
      populate: ['customer'],
    })

    if (!entry) return ctx.notFound('Favori introuvable')

    const entryCustomer = (entry.customer as
      | { id?: number; documentId?: string }
      | null)
      ? entry.customer
      : null
    const ownerMatchesById =
      typeof entryCustomer?.id === 'number' && entryCustomer.id === user.id
    const ownerMatchesByDocumentId =
      typeof entryCustomer?.documentId === 'string' &&
      typeof user.documentId === 'string' &&
      entryCustomer.documentId === user.documentId

    if (!ownerMatchesById && !ownerMatchesByDocumentId) {
      return ctx.forbidden('Accès refusé')
    }

    await svc.delete({ documentId: id })

    ctx.status = 204
    return null
  },
}))
