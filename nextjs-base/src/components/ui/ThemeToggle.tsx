'use client'

import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const stored = localStorage.getItem('theme-override')

    const applyTheme = (mode: 'dark' | 'light') => {
      root.classList.toggle('dark', mode === 'dark')
      setIsDark(mode === 'dark')
    }

    if (stored === 'dark' || stored === 'light') {
      applyTheme(stored)
    } else {
      applyTheme(media.matches ? 'dark' : 'light')
    }

    const onSystemChange = (e: MediaQueryListEvent) => {
      const override = localStorage.getItem('theme-override')
      if (override !== 'dark' && override !== 'light') {
        applyTheme(e.matches ? 'dark' : 'light')
      }
    }

    media.addEventListener('change', onSystemChange)
    const timeoutId = window.setTimeout(() => setMounted(true), 0)

    return () => {
      clearTimeout(timeoutId)
      media.removeEventListener('change', onSystemChange)
    }
  }, [])

  const toggle = () => {
    const root = document.documentElement
    const next = !isDark
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const nextMode = next ? 'dark' : 'light'

    root.classList.toggle('dark', next)
    setIsDark(next)

    // If user returns to their system preference, remove override and follow system again.
    if ((next && systemDark) || (!next && !systemDark)) {
      localStorage.removeItem('theme-override')
    } else {
      localStorage.setItem('theme-override', nextMode)
    }
  }

  // Render placeholder with same dimensions to avoid layout shift
  if (!mounted) {
    return <div className="h-9 w-9" aria-hidden />
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-400 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
    >
      {isDark ? (
        // Sun icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        // Moon icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  )
}
