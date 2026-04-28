/**
 * Strapi Webhook: Sync products to Stripe on save/publish
 *
 * In Strapi v5, a publish action fires both afterCreate and afterUpdate
 * at the DB level (draft deleted → published entry created + document updated).
 * We deduplicate by documentId within a 3-second window so only one Stripe
 * sync runs per publish action.
 */

import {
  syncProductToStripe,
  deleteStripeProduct,
  archiveStripeProduct,
  getStripeDescriptionFromProduct,
} from '../api/product/services/stripe';

// Deduplication: track recently synced documentIds
const recentlySynced = new Set<string>();

async function syncProduct(documentId: string, entity: any, strapi: any) {
  // Already synced in this action cycle — skip
  if (recentlySynced.has(documentId)) return;
  recentlySynced.add(documentId);
  setTimeout(() => recentlySynced.delete(documentId), 3000);

  // If product is inactive (active=false), archive it in Stripe and stop
  if (!entity.active) {
    if (entity.documentId) {
      console.log('[Webhook] Product inactive, archiving in Stripe:', documentId);
      await archiveStripeProduct(documentId);
    }
    return;
  }

  if (!entity.price) return;

  console.log('[Webhook] Syncing product to Stripe:', documentId);

  const description = await getStripeDescriptionFromProduct(strapi, documentId);

  const result = await syncProductToStripe({
    documentId,
    name: entity.name,
    slug: entity.slug,
    price: Math.round(entity.price * 100),
    description,
  });

  if (result.success && result.pricePriceId) {
    if (entity.stripePriceId !== result.pricePriceId) {
      await strapi.documents('api::product.product').update({
        documentId,
        data: { stripePriceId: result.pricePriceId },
      });
      console.log(`[Webhook] stripePriceId saved: ${result.pricePriceId}`);
    } else {
      console.log(`[Webhook] stripePriceId already up to date: ${result.pricePriceId}`);
    }
  } else if (!result.success) {
    console.warn(`[Webhook] Stripe sync failed:`, result.error);
  }
}

export default (strapi: any) => {
  strapi.db?.lifecycles.subscribe({
    models: ['api::product.product'],

    async afterCreate(event: any) {
      const entity = event.result;
      if (!entity?.documentId) return;

      // Ignore self-sync writes (only stripePriceId set)
      const fields = Object.keys(event.params?.data ?? {});
      if (fields.length > 0 && fields.every((k) => ['stripePriceId', 'updatedAt'].includes(k))) return;

      await syncProduct(entity.documentId, entity, strapi);
    },

    async afterUpdate(event: any) {
      const entity = event.result;
      if (!entity?.documentId) return;

      // Ignore self-sync writes (only stripePriceId set)
      const fields = Object.keys(event.params?.data ?? {});
      if (fields.length > 0 && fields.every((k) => ['stripePriceId', 'updatedAt'].includes(k))) return;

      await syncProduct(entity.documentId, entity, strapi);
    },

    async beforeDelete(event: any) {
      const { data = event.state } = event.params;
      if (!data?.documentId) return;

      console.log('[Webhook] Product deleted:', data.documentId);
      await deleteStripeProduct(data.documentId);
    },
  });

  strapi.db?.lifecycles.subscribe({
    models: ['api::watch-file.watch-file'],

    async afterCreate(event: any) {
      const linkedDocumentId = event.result?.product?.documentId;
      if (!linkedDocumentId) return;

      const linkedProduct = await strapi.documents('api::product.product').findOne({
        documentId: linkedDocumentId,
        fields: ['documentId', 'name', 'slug', 'price', 'active', 'stripePriceId'],
      });

      if (!linkedProduct) return;
      await syncProduct(linkedDocumentId, linkedProduct, strapi);
    },

    async afterUpdate(event: any) {
      const linkedDocumentId = event.result?.product?.documentId;
      if (!linkedDocumentId) return;

      const linkedProduct = await strapi.documents('api::product.product').findOne({
        documentId: linkedDocumentId,
        fields: ['documentId', 'name', 'slug', 'price', 'active', 'stripePriceId'],
      });

      if (!linkedProduct) return;
      await syncProduct(linkedDocumentId, linkedProduct, strapi);
    },
  });
};
