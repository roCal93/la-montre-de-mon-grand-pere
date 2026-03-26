/**
 * watch-file controller
 * Les clients ne peuvent voir que leurs propres dossiers (IDOR prevention)
 */

import { factories } from '@strapi/strapi'

type UID = 'api::watch-file.watch-file'
const MODEL_UID: UID = 'api::watch-file.watch-file'

export default factories.createCoreController(MODEL_UID, ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.user as { id: number } | null
    if (!user) return ctx.unauthorized('Authentification requise')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries = await (strapi.documents(MODEL_UID) as any).findMany({
      filters: { customer: { id: { $eq: user.id } } },
      populate: ['photos_before', 'photos_after', 'order', 'product'],
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
      populate: ['photos_before', 'photos_after', 'order', 'product', 'customer'],
    })

    if (!entry) return ctx.notFound('Dossier introuvable')

    const customerId = (entry.customer as { id: number } | null)?.id
    if (customerId !== user.id) return ctx.forbidden('Accès refusé')

    return { data: entry }
  },

  // create/update/delete are admin-only — no override needed, permissions enforced via Strapi roles
}))
