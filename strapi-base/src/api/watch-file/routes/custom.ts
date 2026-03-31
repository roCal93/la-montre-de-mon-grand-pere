/**
 * Custom routes for watch-file
 * Used internally by Next.js webhook (API token auth)
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/watch-files/assign-customer',
      handler: 'watch-file.assignCustomer',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
}
