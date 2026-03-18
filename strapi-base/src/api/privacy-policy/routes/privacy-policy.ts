/**
 * privacy-policy router
 */

import { factories } from '@strapi/strapi';
type CreateCoreRouterArg = Parameters<typeof factories.createCoreRouter>[0];

export default factories.createCoreRouter('api::privacy-policy.privacy-policy' as CreateCoreRouterArg);
