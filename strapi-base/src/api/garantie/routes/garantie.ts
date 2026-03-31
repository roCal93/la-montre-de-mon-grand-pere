/**
 * garantie router
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/garantie',
      handler: 'garantie.find',
      config: { policies: [] },
    },
    {
      method: 'PUT',
      path: '/garantie',
      handler: 'garantie.update',
      config: { policies: [] },
    },
    {
      method: 'DELETE',
      path: '/garantie',
      handler: 'garantie.delete',
      config: { policies: [] },
    },
  ],
}
