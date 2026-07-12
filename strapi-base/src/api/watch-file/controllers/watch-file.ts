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
      populate: mergePopulate(sanitizedQuery.populate, {
        customer: true,
        product: true,
      }),
    })

    if (!entry) return ctx.notFound('Dossier introuvable')

    const customerId = (entry.customer as { id: number } | null)?.id
    if (customerId !== user.id && !isAdmin) return ctx.forbidden('Accès refusé')

    return { data: entry }
  },

  /**
   * Called by Next.js webhook and usable as manual fallback.
   * Assigns an existing watch-file to a Strapi user account and optionally links an order.
   *
   * Body (minimum):
   * - one watch-file selector: watchFileDocumentId OR productDocumentId
   * - one customer selector: customerId OR customerDocumentId OR customerEmail
   * Optional: orderDocumentId, force (default true)
   */
  async assignCustomer(ctx) {
    const {
      watchFileDocumentId,
      productDocumentId,
      customerId,
      customerDocumentId,
      customerEmail,
      orderDocumentId,
      force,
    } =
      ctx.request.body as {
        watchFileDocumentId?: string
        productDocumentId?: string
        customerId?: number | string
        customerDocumentId?: string
        customerEmail?: string
        orderDocumentId?: string
        force?: boolean
      }

    if (!watchFileDocumentId && !productDocumentId) {
      return ctx.badRequest(
        'watchFileDocumentId or productDocumentId is required'
      )
    }

    if (!customerId && !customerDocumentId && !customerEmail) {
      return ctx.badRequest(
        'customerId, customerDocumentId or customerEmail is required'
      )
    }

    const shouldForce = force !== false

    // Find the Strapi user from one of the provided identifiers.
    let users: Array<{ id: number; documentId?: string; email?: string }> = []
    const parsedCustomerId =
      typeof customerId === 'string' ? Number.parseInt(customerId, 10) : customerId

    if (typeof parsedCustomerId === 'number' && Number.isInteger(parsedCustomerId)) {
      users = await strapi
        .query('plugin::users-permissions.user')
        .findMany({ where: { id: parsedCustomerId }, limit: 1, select: ['id', 'documentId', 'email'] })
    } else if (customerDocumentId) {
      users = await strapi
        .query('plugin::users-permissions.user')
        .findMany({
          where: { documentId: customerDocumentId },
          limit: 1,
          select: ['id', 'documentId', 'email'],
        })
    } else if (customerEmail) {
      users = await strapi
        .query('plugin::users-permissions.user')
        .findMany({
          where: { email: { $eqi: customerEmail } },
          limit: 1,
          select: ['id', 'documentId', 'email'],
        })
    }

    const user = users[0] as
      | { id: number; documentId?: string; email?: string }
      | undefined

    if (!user) {
      // Not an error — user may not exist yet.
      return ctx.send({ success: false, reason: 'user_not_found' })
    }

    let watchFile:
      | { documentId: string; customer?: { id: number } | null }
      | undefined

    if (watchFileDocumentId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      watchFile = await (strapi.documents(MODEL_UID) as any).findOne({
        documentId: watchFileDocumentId,
        populate: ['customer'],
      })
    } else {
      // Find the watch-file linked to this product
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const watchFiles = await (strapi.documents(MODEL_UID) as any).findMany({
        filters: { product: { documentId: { $eq: productDocumentId } } },
        populate: ['customer'],
        limit: 1,
      })
      watchFile = watchFiles[0] as
        | { documentId: string; customer?: { id: number } | null }
        | undefined
    }

    if (!watchFile) {
      return ctx.send({ success: false, reason: 'watch_file_not_found' })
    }

    const currentCustomerId = watchFile.customer?.id
    if (currentCustomerId && currentCustomerId !== user.id && !shouldForce) {
      return ctx.send({
        success: false,
        reason: 'already_assigned',
        watchFileDocumentId: watchFile.documentId,
        currentCustomerId,
      })
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

    return ctx.send({
      success: true,
      watchFileDocumentId: watchFile.documentId,
      customerId: user.id,
      customerDocumentId: user.documentId ?? null,
      customerEmail: user.email ?? null,
      replacedExistingCustomer:
        typeof currentCustomerId === 'number' && currentCustomerId !== user.id,
    })
  },

  // create/update/delete are admin-only — no override needed, permissions enforced via Strapi roles
}))
