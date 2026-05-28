/**
 * watch-file controller
 * Les clients ne peuvent voir que leurs propres dossiers (IDOR prevention)
 */

import { factories } from '@strapi/strapi'

type UID = 'api::watch-file.watch-file'
const MODEL_UID: UID = 'api::watch-file.watch-file'

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries = await (strapi.documents(MODEL_UID) as any).findMany({
      ...sanitizedQuery,
      ...(isAdmin && adminAll
        ? {}
        : { filters: { customer: { id: { $eq: user.id } } } }),
      populate: mergePopulate(sanitizedQuery.populate, {
        publicBeforeImage: true,
        publicAfterImage: true,
        order: true,
        product: true,
      }),
    })

    return { data: entries, meta: {} }
  },

  async findOne(ctx) {
    const user = ctx.state.user as { id: number; email?: string } | null

    const adminEmail = process.env.ADMIN_EMAIL
    const isAdmin =
      adminEmail && user?.email?.toLowerCase() === adminEmail.toLowerCase()

    const { id } = ctx.params as { id: string }
    await this.validateQuery(ctx)
    const sanitizedQuery = await this.sanitizeQuery(ctx)

    // Public (unauthenticated) access: allowed but sensitive relations are stripped.
    if (!user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entry = await (strapi.documents(MODEL_UID) as any).findOne({
        documentId: id,
        populate: sanitizedQuery.populate,
      })

      if (!entry) return ctx.notFound('Dossier introuvable')

      // Strip sensitive fields even if accidentally populated by the caller.
      const PRIVATE_FIELDS = new Set(['customer', 'order'])
      const publicEntry = Object.fromEntries(
        Object.entries(entry as Record<string, unknown>).filter(
          ([key]) => !PRIVATE_FIELDS.has(key)
        )
      )
      return { data: publicEntry }
    }

    // Authenticated access: enforce ownership / admin check.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entry = await (strapi.documents(MODEL_UID) as any).findOne({
      documentId: id,
      populate: mergePopulate(sanitizedQuery.populate, { customer: true }),
    })

    if (!entry) return ctx.notFound('Dossier introuvable')

    const customerId = (entry.customer as { id: number } | null)?.id
    if (customerId !== user.id && !isAdmin) return ctx.forbidden('Accès refusé')

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
