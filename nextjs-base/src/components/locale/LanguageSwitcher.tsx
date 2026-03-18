'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  defaultLocale as STATIC_DEFAULT_LOCALE,
  locales as STATIC_LOCALES,
} from '@/lib/locales'

type LocalesResponse = {
  locales: string[]
  defaultLocale: string
}

interface LanguageSwitcherProps {
  side?: 'left' | 'right'
  onOpenChange?: (open: boolean) => void
}

export function LanguageSwitcher({
  side = 'left',
  onOpenChange,
}: LanguageSwitcherProps = {}) {
  const pathname = usePathname() ?? '/'
  const segments = pathname.split('/')

  const [supportedLocales, setSupportedLocales] = React.useState<string[]>([
    ...(STATIC_LOCALES as readonly string[]),
  ])
  const [defaultLocale, setDefaultLocale] = React.useState<string>(
    STATIC_DEFAULT_LOCALE
  )

  React.useEffect(() => {
    let isMounted = true

    ;(async () => {
      try {
        const res = await fetch('/api/locales')
        if (!res.ok) return
        const json = (await res.json()) as Partial<LocalesResponse>

        const locales = Array.isArray(json.locales)
          ? json.locales.filter(
              (l): l is string =>
                typeof l === 'string' &&
                l.length > 0 &&
                (STATIC_LOCALES as readonly string[]).includes(l)
            )
          : []

        if (!isMounted) return
        if (locales.length > 0) setSupportedLocales(locales)
        if (
          typeof json.defaultLocale === 'string' &&
          json.defaultLocale.length > 0
        )
          setDefaultLocale(json.defaultLocale)
      } catch {
        // ignore: fallback to static locales
      }
    })()

    return () => {
      isMounted = false
    }
  }, [])

  const currentSegment = segments[1]
  const currentLocale =
    currentSegment && supportedLocales.includes(currentSegment)
      ? currentSegment
      : defaultLocale

  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen)
      onOpenChange?.(newOpen)
    },
    [onOpenChange]
  )

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node))
        handleOpenChange(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleOpenChange(false)
    }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [handleOpenChange])

  const otherLocales = supportedLocales.filter((l) => l !== currentLocale)

  const [canHover, setCanHover] = React.useState(false)
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      setCanHover(window.matchMedia('(hover: hover)').matches)
    }
  }, [])

  const shouldReduceMotion = useReducedMotion()

  // If only one locale is supported, hide the language switcher entirely
  if (supportedLocales.length <= 1) return null

  return (
    <div
      className="relative"
      ref={containerRef}
      onMouseEnter={() =>
        canHover && otherLocales.length > 0 && handleOpenChange(true)
      }
      onMouseLeave={() => canHover && handleOpenChange(false)}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => otherLocales.length > 0 && handleOpenChange(!open)}
        className="w-9 h-9 rounded-full border hover:border-2 transition-all duration-150 flex items-center justify-center text-sm font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-200"
      >
        {currentLocale.toUpperCase()}
      </button>

      <AnimatePresence>
        {open && otherLocales.length > 0 && (
          <motion.div
            role="menu"
            aria-label="Choisir la langue"
            initial={
              shouldReduceMotion ? {} : { opacity: 0, scale: 0.9, y: -6 }
            }
            animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95, y: -4 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 32,
              duration: 0.2,
            }}
            className={`absolute ${
              side === 'right'
                ? 'right-1/2 translate-x-1/2'
                : 'left-1/2 -translate-x-1/2'
            } top-full pt-2 flex flex-col items-center gap-1 z-50`}
          >
            {otherLocales.map((loc, idx) => {
              const href =
                '/' + [loc, ...segments.slice(2)].filter(Boolean).join('/')
              return (
                <motion.div
                  key={loc}
                  initial={shouldReduceMotion ? {} : { opacity: 0, y: -4 }}
                  animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? {} : { opacity: 0, y: -2 }}
                  transition={{ delay: idx * 0.03, duration: 0.12 }}
                >
                  <Link
                    role="menuitem"
                    href={href}
                    onClick={() => handleOpenChange(false)}
                    className="w-9 h-9 rounded-full border hover:border-2 transition-all duration-150 flex items-center justify-center text-sm font-semibold"
                  >
                    {loc.toUpperCase()}
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
