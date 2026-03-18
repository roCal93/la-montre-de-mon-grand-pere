'use client'

import { useLayoutEffect } from 'react'

interface LangSetterProps {
  lang: string
}

export function LangSetter({ lang }: LangSetterProps) {
  useLayoutEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return null
}
