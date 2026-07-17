'use client'

import { useLayoutEffect } from 'react'

interface CookieSetterProps {
  lang: string
}

export function CookieSetter({ lang }: CookieSetterProps) {
  useLayoutEffect(() => {
    try {
      const isProd = process.env.NODE_ENV === 'production'
      // Don't overwrite existing locale cookie
      const has = document.cookie
        .split('; ')
        .some((c) => c.startsWith('locale='))
      if (!has) {
        document.cookie = `locale=${encodeURIComponent(lang)}; Path=/; SameSite=Lax${isProd ? '; Secure' : ''}`
      }
    } catch {
      // ignore
    }
  }, [lang])

  return null
}
