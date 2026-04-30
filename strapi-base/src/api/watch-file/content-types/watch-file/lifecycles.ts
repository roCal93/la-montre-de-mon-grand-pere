export default {
  beforeCreate(event) {
    const data = event.params?.data ?? {}

    // watch-file is not localized, so its persisted locale must stay null.
    if ('locale' in data) {
      data.locale = null
    }

    event.params.data = data
  },

  beforeUpdate(event) {
    const data = event.params?.data ?? {}

    if ('locale' in data) {
      data.locale = null
    }

    event.params.data = data
  },
}
