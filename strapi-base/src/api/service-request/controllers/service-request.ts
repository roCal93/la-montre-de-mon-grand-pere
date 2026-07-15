/**
 * service-request controller
 * Ownership enforced: clients ne voient que leurs propres demandes
 */

import { factories } from '@strapi/strapi'

type UID = 'api::service-request.service-request'
const MODEL_UID: UID = 'api::service-request.service-request'

function mergePopulate(
  queryPopulate: unknown,
  requiredPopulate: Record<string, true>
) {
  if (!queryPopulate) return requiredPopulate
  if (queryPopulate === '*') return queryPopulate

  if (Array.isArray(queryPopulate)) {
    return Array.from(
      new Set([...queryPopulate, ...Object.keys(requiredPopulate)])
    )
  }

  if (typeof queryPopulate === 'string') {
    return Array.from(
      new Set([queryPopulate, ...Object.keys(requiredPopulate)])
    )
  }

  if (typeof queryPopulate === 'object') {
    return {
      ...(queryPopulate as Record<string, unknown>),
      ...requiredPopulate,
    }
  }

  return requiredPopulate
}

function mergeFilters(
  baseFilters: unknown,
  ownershipFilter: Record<string, unknown> | null
) {
  if (!ownershipFilter) return baseFilters
  if (!baseFilters) return ownershipFilter

  return {
    $and: [baseFilters, ownershipFilter],
  }
}

export default factories.createCoreController(MODEL_UID, ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.user as { id: number; email?: string } | null
    if (!user) return ctx.unauthorized('Authentification requise')

    const adminEmail = process.env.ADMIN_EMAIL
    const isAdmin =
      adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase()
    const adminAll = ctx.query.adminAll === 'true'

    await this.validateQuery(ctx)
    const sanitizedQuery = await this.sanitizeQuery(ctx)
    const ownershipFilter =
      isAdmin && adminAll ? null : { customer: { id: { $eq: user.id } } }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries = await (strapi.documents(MODEL_UID) as any).findMany({
      ...sanitizedQuery,
      filters: mergeFilters(sanitizedQuery.filters, ownershipFilter),
      populate: mergePopulate(sanitizedQuery.populate, {
        photos: true,
        customer: true,
        watch_file: true,
      }),
    })

    return { data: entries, meta: {} }
  },

  async findOne(ctx) {
    const user = ctx.state.user as { id: number; email?: string } | null
    if (!user) return ctx.unauthorized('Authentification requise')

    const adminEmail = process.env.ADMIN_EMAIL
    const isAdmin =
      adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase()

    const { id } = ctx.params as { id: string }

    await this.validateQuery(ctx)
    const sanitizedQuery = await this.sanitizeQuery(ctx)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entry = await (strapi.documents(MODEL_UID) as any).findOne({
      documentId: id,
      populate: mergePopulate(sanitizedQuery.populate, {
        photos: true,
        customer: true,
        watch_file: true,
      }),
    })

    if (!entry) return ctx.notFound('Demande introuvable')

    const customerId = (entry.customer as { id: number } | null)?.id
    if (customerId !== user.id && !isAdmin) return ctx.forbidden('Accès refusé')

    return { data: entry }
  },

  async create(ctx) {
    const user = ctx.state.user as { id: number } | null
    if (!user) return ctx.unauthorized('Authentification requise')

    const body = ctx.request.body as { data?: Record<string, unknown> }
    const data = body?.data ?? {}

    // Force the customer to be the authenticated user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entry = await (strapi.documents(MODEL_UID) as any).create({
      data: { ...data, customer: user.id },
      populate: ['photos'],
    })

    ctx.status = 201
    return { data: entry }
  },
}))
