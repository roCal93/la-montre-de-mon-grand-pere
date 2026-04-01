export default {
  beforeCreate(event) {
    const data = event.params?.data ?? {}

    // Avoid null locale documents that break relation linking in Content Manager.
    if (!data.locale) {
      data.locale = 'fr'
    }

    event.params.data = data
  },
}
