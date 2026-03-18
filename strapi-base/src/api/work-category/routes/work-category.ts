/**
 * work-category router
 */

import { factories } from '@strapi/strapi';
type CreateCoreRouterArg = Parameters<typeof factories.createCoreRouter>[0];

export default factories.createCoreRouter('api::work-category.work-category' as CreateCoreRouterArg);
