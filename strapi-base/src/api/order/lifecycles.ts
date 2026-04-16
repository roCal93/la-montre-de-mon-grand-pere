/**
 * Order lifecycles
 * After an order is created (via Stripe webhook), auto-assign the watch-file
 * linked to each purchased product to the buyer's Strapi user account.
 */

type WatchFileUID = 'api::watch-file.watch-file'
const WATCH_FILE_UID: WatchFileUID = 'api::watch-file.watch-file'

export default {
  async afterCreate(event: {
    result: {
      documentId: string
      customerEmail?: string
      lineItems?: Array<{ productId?: string }>
    }
  }) {
    // Log immediately to confirm the lifecycle is being called
    strapi.log.info(
      `[order lifecycle] afterCreate fired — documentId=${event.result?.documentId} email=${event.result?.customerEmail}`
    )

    try {
      const { result } = event
      const orderDocumentId = result.documentId
      const customerEmail = result.customerEmail

      if (!customerEmail) {
        strapi.log.warn('[order lifecycle] No customerEmail in result — skipping watch-file assignment')
        return
      }

      // Re-fetch the order with lineItems populated (components are not in event.result)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const order = await (strapi.documents('api::order.order') as any).findOne({
        documentId: orderDocumentId,
        populate: ['lineItems'],
      })
      strapi.log.info(
        `[order lifecycle] lineItems from DB: ${JSON.stringify(order?.lineItems)}`
      )
      const lineItems = (order?.lineItems ?? []) as Array<{ productId?: string }>

      if (!lineItems.length) {
        strapi.log.warn('[order lifecycle] No lineItems found after populate — skipping')
        return
      }

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

      // For each purchased product, find the linked watch-file and assign it to the buyer
      await Promise.all(
        lineItems.map(async (item) => {
          const numericId = parseInt(item.productId ?? '', 10)
          if (isNaN(numericId)) return

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const watchFiles = await (strapi.documents(WATCH_FILE_UID) as any).findMany({
            filters: { product: { id: { $eq: numericId } } },
            populate: ['customer'],
            limit: 1,
          })
          const watchFile = watchFiles[0] as { documentId: string; customer?: unknown } | undefined

          if (!watchFile) {
            strapi.log.warn(
              `[order lifecycle] No watch-file found for product id=${numericId}`
            )
            return
          }

          // Guard: skip if already assigned to avoid double-assignment on lifecycle retry
          if (watchFile.customer) {
            strapi.log.info(
              `[order lifecycle] Watch-file ${watchFile.documentId} already assigned — skipping`
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
}
