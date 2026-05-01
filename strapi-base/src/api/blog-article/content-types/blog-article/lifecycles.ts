const DEFAULT_LOCALE = 'fr'

export default {
  beforeCreate(event) {
    const data = event.params?.data ?? {}

    if (!data.locale) {
      data.locale = DEFAULT_LOCALE
    }

    event.params.data = data
  },

  beforeUpdate(event) {
    const data = event.params?.data ?? {}

    if ('locale' in data && !data.locale) {
      data.locale = DEFAULT_LOCALE
    }

    event.params.data = data
  },
}