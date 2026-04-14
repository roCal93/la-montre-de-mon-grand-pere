/**
 * Strapi Webhook: Sync products to Stripe on save/publish
 *
 * In Strapi v5, a publish action fires both afterCreate and afterUpdate
 * at the DB level (draft deleted → published entry created + document updated).
 * We deduplicate by documentId within a 3-second window so only one Stripe
 * sync runs per publish action.
 */

import { syncProductToStripe, deleteStripeProduct, archiveStripeProduct } from '../api/product/services/stripe';

// Deduplication: track recently synced documentIds
const recentlySynced = new Set<string>();

async function syncProduct(documentId: string, entity: any, strapi: any) {
  // Already synced in this action cycle — skip
  if (recentlySynced.has(documentId)) return;
  recentlySynced.add(documentId);
  setTimeout(() => recentlySynced.delete(documentId), 3000);

  // If product is inactive (stock = 0), archive it in Stripe and stop
  if (!entity.active) {
    if (entity.documentId) {
      console.log('[Webhook] Product inactive, archiving in Stripe:', documentId);
      await archiveStripeProduct(documentId);
    }
    return;
  }

  if (!entity.price) return;

  console.log('[Webhook] Syncing product to Stripe:', documentId);

  const result = await syncProductToStripe({
    documentId,
    name: entity.name,
    slug: entity.slug,
    price: Math.round(entity.price * 100),
    description: entity.description,
    shortDescription: entity.shortDescription,
  });

  if (result.success && result.pricePriceId) {
    if (entity.stripePriceId !== result.pricePriceId) {
      try {
        await strapi.documents('api::product.product').update({
          documentId,
          locale: entity.locale,
          data: { stripePriceId: result.pricePriceId },
        });
        console.log(`[Webhook] stripePriceId saved: ${result.pricePriceId}`);
      } catch (error) {
        console.error('[Webhook] Failed to persist stripePriceId:', error);
      }
    } else {
      console.log(`[Webhook] stripePriceId already up to date: ${result.pricePriceId}`);
    }
  } else if (!result.success) {
    console.warn(`[Webhook] Stripe sync failed:`, result.error);
  }
}

export default (strapi: any) => {
  const stripeSyncEnabled = process.env.STRIPE_SYNC_ENABLED !== 'false';
  if (!stripeSyncEnabled) {
    console.log('[Webhook] Stripe sync disabled via STRIPE_SYNC_ENABLED=false');
    return;
  }

  strapi.db?.lifecycles.subscribe({
    models: ['api::product.product'],

    async afterCreate(event: any) {
      const entity = event.result;
      if (!entity?.documentId) return;

      // Ignore self-sync writes (only stripePriceId set)
      const fields = Object.keys(event.params?.data ?? {});
      if (fields.length > 0 && fields.every((k) => ['stripePriceId', 'updatedAt'].includes(k))) return;

      try {
        await syncProduct(entity.documentId, entity, strapi);
      } catch (error) {
        console.error('[Webhook] afterCreate sync failed (non-blocking):', error);
      }
    },

    async afterUpdate(event: any) {
      const entity = event.result;
      if (!entity?.documentId) return;

      // Ignore self-sync writes (only stripePriceId set)
      const fields = Object.keys(event.params?.data ?? {});
      if (fields.length > 0 && fields.every((k) => ['stripePriceId', 'updatedAt'].includes(k))) return;

      try {
        await syncProduct(entity.documentId, entity, strapi);
      } catch (error) {
        console.error('[Webhook] afterUpdate sync failed (non-blocking):', error);
      }
    },

    // Intentionally no delete hook here:
    // in Strapi v5, publish flow may perform internal draft deletions.
    // Triggering external destructive sync on those technical deletions is unsafe.
  });
};
