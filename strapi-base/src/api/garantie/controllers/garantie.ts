/**
 * garantie controller
 */

const UID = 'api::garantie.garantie' as const

export default {
  async find(ctx: any) {
    const { locale, populate } = ctx.query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const document = await (strapi.documents as any)(UID).findFirst({ locale, populate })
    if (!document) {
      return ctx.notFound()
    }
    return { data: document }
  },

  async update(ctx: any) {
    const { locale } = ctx.query
    const { data } = ctx.request.body
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (strapi.documents as any)(UID).findFirst({ locale })
    if (!existing) {
      return ctx.notFound()
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (strapi.documents as any)(UID).update(existing.documentId, { locale, data })
    return { data: updated }
  },

  async delete(ctx: any) {
    const { locale } = ctx.query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (strapi.documents as any)(UID).findFirst({ locale })
    if (!existing) {
      return ctx.notFound()
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (strapi.documents as any)(UID).delete(existing.documentId, { locale })
    return { data: existing }
  },
}
