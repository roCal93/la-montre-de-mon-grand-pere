'use client'

import { useLayoutEffect } from 'react'

interface CookieSetterProps {
  lang: string
}

export function CookieSetter({ lang }: CookieSetterProps) {
  useLayoutEffect(() => {
    try {
      // Don't overwrite existing locale cookie
      const has = document.cookie
        .split('; ')
        .some((c) => c.startsWith('locale='))
      if (!has) {
        document.cookie = `locale=${encodeURIComponent(lang)}; Path=/; SameSite=Lax`
      }
    } catch {
      // ignore
    }
  }, [lang])

  return null
}
