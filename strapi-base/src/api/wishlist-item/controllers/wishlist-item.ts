/**
 * wishlist-item controller
 * Ownership enforced: chaque client ne voit que ses propres favoris
 */

import { factories } from '@strapi/strapi'

type UID = 'api::wishlist-item.wishlist-item'
const MODEL_UID: UID = 'api::wishlist-item.wishlist-item'

type CustomerIdentity = {
  id?: number
  documentId?: string
}

function getCustomerIdentity(ctx: {
  state: { user?: { id?: number | string; documentId?: string } | null }
  request: { header: Record<string, string | string[] | undefined> }
}): CustomerIdentity | null {
  const userId = ctx.state.user?.id
  if (typeof userId === 'number' && userId > 0) {
    return {
      id: userId,
      documentId:
        typeof ctx.state.user?.documentId === 'string'
          ? ctx.state.user.documentId
          : undefined,
    }
  }

  if (typeof userId === 'string' && userId.trim()) {
    const normalized = userId.trim()
    const parsed = Number.parseInt(normalized, 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      return { id: parsed, documentId: normalized }
    }

    return { documentId: normalized }
  }

  const headerValue = ctx.request.header['x-hakuna-customer-id']
  const normalizedHeader = Array.isArray(headerValue)
    ? headerValue[0]
    : headerValue
  const parsed = Number.parseInt(normalizedHeader ?? '', 10)
  if (Number.isFinite(parsed) && parsed > 0) {
    return { id: parsed }
  }

  const documentHeader = ctx.request.header['x-hakuna-customer-document-id']
  const normalizedDocumentHeader = Array.isArray(documentHeader)
    ? documentHeader[0]
    : documentHeader
  if (typeof normalizedDocumentHeader === 'string' && normalizedDocumentHeader.trim()) {
    return { documentId: normalizedDocumentHeader.trim() }
  }

  return null
}

function buildCustomerFilter(customer: CustomerIdentity) {
  const filters: Array<Record<string, unknown>> = []
  if (customer.id) {
    filters.push({ customer: { id: { $eq: customer.id } } })
  }
  if (customer.documentId) {
    filters.push({ customer: { documentId: { $eq: customer.documentId } } })
  }

  if (filters.length === 0) return null
  if (filters.length === 1) return filters[0]
  return { $or: filters }
}

function buildProductFilter(productRef: string | number) {
  const normalized = String(productRef).trim()
  const filters: Array<Record<string, unknown>> = [
    { product: { documentId: { $eq: normalized } } },
  ]

  const parsed = Number.parseInt(normalized, 10)
  if (Number.isFinite(parsed) && String(parsed) === normalized) {
    filters.push({ product: { id: { $eq: parsed } } })
  }

  if (filters.length === 1) return filters[0]
  return { $or: filters }
}

export default factories.createCoreController(MODEL_UID, ({ strapi }) => ({
  async find(ctx) {
    const customer = getCustomerIdentity(ctx)
    if (!customer) {
      return ctx.unauthorized('Authentification requise')
    }

    const customerFilter = buildCustomerFilter(customer)
    if (!customerFilter) return ctx.unauthorized('Authentification requise')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries = await (strapi.documents(MODEL_UID) as any).findMany({
      filters: customerFilter,
      populate: {
        product: {
          populate: { images: true },
        },
      },
    })

    strapi.log.info(
      `[wishlist] find — customer.id=${customer.id ?? 'n/a'} customer.documentId=${customer.documentId ?? 'n/a'} count=${entries?.length ?? 0}`
    )

    return { data: entries, meta: {} }
  },

  async create(ctx) {
    const customer = getCustomerIdentity(ctx)
    if (!customer) {
      return ctx.unauthorized('Authentification requise')
    }

    const customerFilter = buildCustomerFilter(customer)
    if (!customerFilter) return ctx.unauthorized('Authentification requise')

    const body = ctx.request.body as { data?: { product?: string | number } }
    const productRef = body?.data?.product
    if (!productRef) return ctx.badRequest('product requis')

    const productFilter = buildProductFilter(productRef)

    // Check if already in wishlist (by product documentId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = strapi.documents(MODEL_UID) as any
    const existing = await svc.findMany({
      filters: {
        $and: [customerFilter, productFilter],
      },
    })

    if (existing.length > 0) {
      strapi.log.info(
        `[wishlist] Already in favorites — customer.id=${customer.id ?? 'n/a'} customer.documentId=${customer.documentId ?? 'n/a'} product=${String(productRef)}`
      )
      return { data: existing[0] }
    }

    const entry = await svc.create({
      data: {
        customer: customer.id ?? customer.documentId,
        product: String(productRef),
      },
      populate: {
        product: {
          populate: { images: true },
        },
      },
    })

    strapi.log.info(
      `[wishlist] Created — customer.id=${customer.id ?? 'n/a'} customer.documentId=${customer.documentId ?? 'n/a'} product=${String(productRef)} entry.documentId=${entry?.documentId}`
    )

    ctx.status = 201
    return { data: entry }
  },

  async delete(ctx) {
    const customer = getCustomerIdentity(ctx)
    if (!customer) return ctx.unauthorized('Authentification requise')

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

    const sameById =
      typeof customer.id === 'number' &&
      typeof entryCustomer?.id === 'number' &&
      entryCustomer.id === customer.id
    const sameByDocumentId =
      typeof customer.documentId === 'string' &&
      typeof entryCustomer?.documentId === 'string' &&
      entryCustomer.documentId === customer.documentId

    if (!sameById && !sameByDocumentId) {
      return ctx.forbidden('Accès refusé')
    }

    await svc.delete({ documentId: id })

    ctx.status = 204
    return null
  },
}))
