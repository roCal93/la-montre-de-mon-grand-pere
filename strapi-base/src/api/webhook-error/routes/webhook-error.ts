/**
 * webhook-error router
 */

import { factories } from '@strapi/strapi';
type CreateCoreRouterArg = Parameters<typeof factories.createCoreRouter>[0];

export default factories.createCoreRouter('api::webhook-error.webhook-error' as CreateCoreRouterArg);
