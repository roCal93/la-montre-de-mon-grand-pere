'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'hakuna-gifs-paused'
const EVENT_NAME = 'hakuna:gifs-paused-change'

const readPaused = () => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) === '1'
}

const applyPausedToDom = (paused: boolean) => {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.gifsPaused = paused ? '1' : '0'
}

export function GifToggle() {
  const [paused, setPaused] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const initial = readPaused()
    applyPausedToDom(initial)
    const timeoutId = window.setTimeout(() => {
      setPaused(initial)
      setMounted(true)
    }, 0)

    const onChange = (event: Event) => {
      const custom = event as CustomEvent<{ paused?: boolean }>
      const next =
        typeof custom.detail?.paused === 'boolean'
          ? custom.detail.paused
          : readPaused()
      setPaused(next)
      applyPausedToDom(next)
    }

    window.addEventListener(EVENT_NAME, onChange as EventListener)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener(EVENT_NAME, onChange as EventListener)
    }
  }, [])

  const toggle = () => {
    const next = !paused
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    setPaused(next)
    applyPausedToDom(next)
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, {
        detail: { paused: next },
      })
    )
  }

  if (!mounted) {
    return <div className="h-9 w-9" aria-hidden />
  }

  return (
    <button
      onClick={toggle}
      aria-label={paused ? 'Relancer les GIF' : 'Mettre les GIF en pause'}
      title={paused ? 'Relancer les GIF' : 'Pause GIF'}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-400 text-gray-700 transition-colors hover:bg-stone-100 dark:border-gray-500 dark:text-gray-200 dark:hover:bg-stone-800"
    >
      {paused ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      )}
    </button>
  )
}
