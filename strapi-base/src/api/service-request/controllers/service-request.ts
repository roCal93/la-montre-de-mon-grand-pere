/**
 * service-request controller
 * Ownership enforced: clients ne voient que leurs propres demandes
 */

import { factories } from '@strapi/strapi'

type UID = 'api::service-request.service-request'
const MODEL_UID: UID = 'api::service-request.service-request'

export default factories.createCoreController(MODEL_UID, ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.user as { id: number } | null
    if (!user) return ctx.unauthorized('Authentification requise')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries = await (strapi.documents(MODEL_UID) as any).findMany({
      filters: { customer: { id: { $eq: user.id } } },
      populate: ['photos'],
    })

    return { data: entries, meta: {} }
  },

  async findOne(ctx) {
    const user = ctx.state.user as { id: number } | null
    if (!user) return ctx.unauthorized('Authentification requise')

    const { id } = ctx.params as { id: string }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entry = await (strapi.documents(MODEL_UID) as any).findOne({
      documentId: id,
      populate: ['photos', 'customer'],
    })

    if (!entry) return ctx.notFound('Demande introuvable')

    const customerId = (entry.customer as { id: number } | null)?.id
    if (customerId !== user.id) return ctx.forbidden('Accès refusé')

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
