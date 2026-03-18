/**
 * work-category service
 */

import { factories } from '@strapi/strapi';
type CreateCoreServiceArg = Parameters<typeof factories.createCoreService>[0];

export default factories.createCoreService('api::work-category.work-category' as CreateCoreServiceArg);
