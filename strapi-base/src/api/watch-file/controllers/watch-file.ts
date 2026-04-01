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

  /**
   * Called by Next.js webhook after a successful Stripe checkout.
   * Assigns the existing watch-file (linked to the purchased product)
   * to the buyer's Strapi user account and links it to the created order.
   *
   * Body: { productDocumentId: string, customerEmail: string, orderDocumentId?: string }
   */
  async assignCustomer(ctx) {
    const { productDocumentId, customerEmail, orderDocumentId } =
      ctx.request.body as {
        productDocumentId?: string
        customerEmail?: string
        orderDocumentId?: string
      }

    if (!productDocumentId || !customerEmail) {
      return ctx.badRequest('productDocumentId and customerEmail are required')
    }

    // Find the Strapi user by email
    const users = await strapi
      .query('plugin::users-permissions.user')
      .findMany({ where: { email: customerEmail }, limit: 1, select: ['id'] })
    const user = users[0]
    if (!user) {
      // Not an error — guest checkout or user not registered yet
      return ctx.send({ success: false, reason: 'user_not_found' })
    }

    // Find the watch-file linked to this product
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const watchFiles = await (strapi.documents(MODEL_UID) as any).findMany({
      filters: { product: { documentId: { $eq: productDocumentId } } },
      limit: 1,
    })
    const watchFile = watchFiles[0] as { documentId: string } | undefined
    if (!watchFile) {
      return ctx.send({ success: false, reason: 'watch_file_not_found' })
    }

    const updateData: Record<string, unknown> = { customer: user.id }
    if (orderDocumentId) {
      updateData.order = { connect: [{ documentId: orderDocumentId }] }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (strapi.documents(MODEL_UID) as any).update({
      documentId: watchFile.documentId,
      data: updateData,
    })

    return ctx.send({ success: true, watchFileDocumentId: watchFile.documentId })
  },

  // create/update/delete are admin-only — no override needed, permissions enforced via Strapi roles
}))
