/**
 * Stripe synchronization service for products
 * Automatically syncs product data to Stripe
 */

import Stripe from 'stripe';

interface SyncProductToStripeInput {
  documentId: string;
  name: string;
  slug: string;
  price: number; // in cents
  description?: string | null;
  shortDescription?: string | null;
}

interface SyncResult {
  success: boolean;
  pricePriceId?: string;
  productId?: string;
  error?: string;
}

/**
 * Get Stripe client instance (lazy initialization)
 */
function getStripeClient(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

/**
 * Create or update a Stripe product and price from Strapi product data
 */
export async function syncProductToStripe(
  product: SyncProductToStripeInput
): Promise<SyncResult> {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      console.warn('[Stripe] STRIPE_SECRET_KEY not configured, skipping sync');
      return { success: false, error: 'STRIPE_SECRET_KEY not configured' };
    }

    // Use slug as unique identifier in Strapi metadata
    const stripeMetadataId = `strapi-${product.documentId}`;

    // Search for existing Stripe product by metadata
    const existingProducts = await stripe.products.search({
      query: `metadata["strapi_id"]:"${product.documentId}"`,
    });

    let stripeProductId: string;

    if (existingProducts.data.length > 0) {
      // Update existing product and re-activate it if needed
      stripeProductId = existingProducts.data[0].id;
      await stripe.products.update(stripeProductId, {
        name: product.name,
        description: product.shortDescription || product.description || undefined,
        active: true,
        metadata: {
          strapi_id: product.documentId,
          strapi_slug: product.slug,
        },
      });
      console.log(`[Stripe] Updated product ${stripeProductId}`);
    } else {
      // Create new product
      const stripeProduct = await stripe.products.create({
        name: product.name,
        description: product.shortDescription || product.description || undefined,
        metadata: {
          strapi_id: product.documentId,
          strapi_slug: product.slug,
        },
      });
      stripeProductId = stripeProduct.id;
      console.log(`[Stripe] Created product ${stripeProductId}`);
    }

    // Get or create a price for this product
    const priceInCents = Math.round(product.price);

    // Search for existing price with the same amount
    const existingPrices = await stripe.prices.search({
      query: `product:"${stripeProductId}" AND metadata["strapi_id"]:"${product.documentId}"`,
    });

    let stripePriceId: string;

    if (existingPrices.data.length > 0) {
      const existingPrice = existingPrices.data[0];
      if (existingPrice.unit_amount === priceInCents) {
        // Price is up-to-date
        stripePriceId = existingPrice.id;
        console.log(`[Stripe] Price unchanged: ${stripePriceId}`);
      } else {
        // Price changed, create new one (Stripe doesn't allow updating prices)
        const newPrice = await stripe.prices.create({
          product: stripeProductId,
          unit_amount: priceInCents,
          currency: 'eur',
          metadata: {
            strapi_id: product.documentId,
          },
        });
        stripePriceId = newPrice.id;
        console.log(`[Stripe] Created new price ${stripePriceId}`);
      }
    } else {
      // Create new price
      const newPrice = await stripe.prices.create({
        product: stripeProductId,
        unit_amount: priceInCents,
        currency: 'eur',
        metadata: {
          strapi_id: product.documentId,
        },
      });
      stripePriceId = newPrice.id;
      console.log(`[Stripe] Created price ${stripePriceId}`);
    }

    return {
      success: true,
      productId: stripeProductId,
      pricePriceId: stripePriceId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Stripe] Sync failed:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Archive (deactivate) a Stripe product by Strapi document ID
 * Used when stock reaches 0 — product stays in Stripe but is no longer purchasable
 */
export async function archiveStripeProduct(documentId: string): Promise<boolean> {
  try {
    const stripe = getStripeClient();
    if (!stripe) return false;

    const existingProducts = await stripe.products.search({
      query: `metadata["strapi_id"]:"${documentId}"`,
    });

    if (existingProducts.data.length === 0) return true;

    await stripe.products.update(existingProducts.data[0].id, { active: false });
    console.log(`[Stripe] Archived product for documentId: ${documentId}`);
    return true;
  } catch (error) {
    console.error('[Stripe] Archive failed:', error);
    return false;
  }
}

/**
 * Delete a Stripe product by Strapi document ID
 */
export async function deleteStripeProduct(documentId: string): Promise<boolean> {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return false;
    }

    const existingProducts = await stripe.products.search({
      query: `metadata["strapi_id"]:"${documentId}"`,
    });

    if (existingProducts.data.length === 0) {
      return true; // Already gone
    }

    await stripe.products.del(existingProducts.data[0].id);
    return true;
  } catch (error) {
    console.error('[Stripe] Delete failed:', error);
    return false;
  }
}
