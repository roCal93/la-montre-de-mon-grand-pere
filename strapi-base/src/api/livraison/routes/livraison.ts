/**
 * livraison router
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/livraison',
      handler: 'livraison.find',
      config: { policies: [] },
    },
    {
      method: 'PUT',
      path: '/livraison',
      handler: 'livraison.update',
      config: { policies: [] },
    },
    {
      method: 'DELETE',
      path: '/livraison',
      handler: 'livraison.delete',
      config: { policies: [] },
    },
  ],
}
