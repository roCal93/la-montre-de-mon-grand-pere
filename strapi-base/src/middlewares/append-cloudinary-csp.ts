export default () => {
  return async (ctx: any, next: () => Promise<any>) => {
    await next()

    const headerName = 'Content-Security-Policy'
    let csp = ctx.response.get(headerName)

    // Build allowed origins list from ALLOWED_ORIGINS or CLIENT_URL fallback
    const allowedEnv = process.env.ALLOWED_ORIGINS || undefined
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000'
    const clientUrlsSet = new Set<string>()

    if (allowedEnv) {
      allowedEnv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((u) => clientUrlsSet.add(u))
    } else {
      clientUrlsSet.add(clientUrl)
      let isLocalUrl = true
      try {
        const { hostname } = new URL(clientUrl)
        isLocalUrl = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
      } catch {
        isLocalUrl = true
      }
      if (!isLocalUrl) {
        const host = clientUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
        const base = host.replace(/^www\./, '')
        clientUrlsSet.add(`https://${base}`)
        clientUrlsSet.add(`https://www.${base}`)
        clientUrlsSet.add(`https://*.${base}`)
      }
    }

    const origins = Array.from(clientUrlsSet)

    // If no CSP header exists, set a safe default that includes Cloudinary and frame directives
    if (!csp) {
      ctx.set(
        headerName,
        `default-src 'self'; img-src 'self' data: https://res.cloudinary.com https://market-assets.strapi.io; frame-src 'self' ${origins.join(' ')}; frame-ancestors 'self' ${origins.join(' ')}; script-src 'self'; style-src 'self' 'unsafe-inline'`
      )
      return
    }

    // Helper: check if a CSP directive string already contains an exact host token
    const hasCloudinary = (directive: string) =>
      /(^|\s)https:\/\/res\.cloudinary\.com(\s|$)/.test(directive)

    // Ensure img-src contains Cloudinary
    let newCsp = csp
    if (newCsp.includes('img-src')) {
      newCsp = newCsp.replace(/img-src([^;]*)/, (match: string, group: string) => {
        if (hasCloudinary(match)) return match
        return `img-src${group} https://res.cloudinary.com`
      })
    } else {
      newCsp = `${newCsp}; img-src 'self' data: https://res.cloudinary.com https://market-assets.strapi.io`
    }

    // Ensure media-src contains Cloudinary (for videos)
    if (newCsp.includes('media-src')) {
      newCsp = newCsp.replace(/media-src([^;]*)/, (match: string, group: string) => {
        if (hasCloudinary(match)) return match
        return `media-src${group} https://res.cloudinary.com`
      })
    } else {
      newCsp = `${newCsp}; media-src 'self' data: blob: https://res.cloudinary.com`
    }

    // Ensure object-src contains Cloudinary (for PDFs)
    // If object-src is 'none', replace it entirely (can't combine 'none' with other sources)
    if (newCsp.includes('object-src')) {
      newCsp = newCsp.replace(/object-src([^;]*)/, (match: string, group: string) => {
        if (hasCloudinary(match)) return match
        // If 'none' is present, replace the entire directive
        if (match.includes("'none'")) {
          return `object-src 'self' https://res.cloudinary.com`
        }
        return `object-src${group} https://res.cloudinary.com`
      })
    } else {
      newCsp = `${newCsp}; object-src 'self' https://res.cloudinary.com`
    }

    ctx.set(headerName, newCsp)
  }
}
