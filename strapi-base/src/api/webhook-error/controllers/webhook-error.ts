/**
 * webhook-error controller
 */

import { factories } from '@strapi/strapi';
type CreateCoreControllerArg = Parameters<typeof factories.createCoreController>[0];

export default factories.createCoreController('api::webhook-error.webhook-error' as CreateCoreControllerArg);
