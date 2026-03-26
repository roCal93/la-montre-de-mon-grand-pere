/**
 * watch-file service
 */

import { factories } from '@strapi/strapi'
type CreateCoreServiceArg = Parameters<typeof factories.createCoreService>[0]

export default factories.createCoreService('api::watch-file.watch-file' as CreateCoreServiceArg)
