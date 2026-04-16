'use client'

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { StrapiMedia } from '@/types/strapi'
import { cleanImageUrl } from '@/lib/strapi'

const gifStillCache = new Map<string, string>()

type BackgroundBlockProps = {
  type: 'color' | 'image' | 'gradient'
  color?: string
  gradient?: string
  image?: StrapiMedia
  imageDesktop?: StrapiMedia
  positionMobile?:
    | 'center center'
    | 'top center'
    | 'bottom center'
    | 'left center'
    | 'right center'
  positionDesktop?:
    | 'center center'
    | 'top center'
    | 'bottom center'
    | 'left center'
    | 'right center'
  sizeMobile?: 'cover' | 'contain' | 'auto'
  sizeDesktop?: 'cover' | 'contain' | 'auto'
  repeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y'
  fixed?: boolean
  overlayColor?: string
  overlayOpacity?: number
  scope?: 'section' | 'global'
}

const BackgroundBlock = ({
  type,
  color,
  gradient,
  image,
  imageDesktop,
  positionMobile = 'center center',
  positionDesktop = 'center center',
  sizeMobile = 'cover',
  sizeDesktop = 'cover',
  repeat = 'no-repeat',
  fixed = false,
  overlayColor,
  overlayOpacity = 0,
  scope = 'section',
}: BackgroundBlockProps) => {
  const GIF_PAUSE_STORAGE_KEY = 'hakuna-gifs-paused'
  const GIF_PAUSE_EVENT = 'hakuna:gifs-paused-change'

  const isGifUrl = (url?: string) => {
    if (!url) return false
    return (
      /\.gif(?:$|[?#])/i.test(url) ||
      /[?&](?:fm|format|ext)=gif(?:&|$)/i.test(url)
    )
  }

  // normalize different media shapes from Strapi (direct or relation)
  type MediaLike =
    | string
    | StrapiMedia
    | { url?: string }
    | { data?: { attributes?: { url?: string } } }
    | { attributes?: { url?: string } }
    | null
    | undefined

  const getMediaUrl = (m?: MediaLike) => {
    if (!m) return undefined
    if (typeof m === 'string') return cleanImageUrl(m)

    if (typeof m === 'object') {
      const obj = m as Record<string, unknown>

      if (typeof obj.url === 'string') return cleanImageUrl(obj.url as string)

      if (
        obj.data &&
        typeof obj.data === 'object' &&
        'attributes' in (obj.data as Record<string, unknown>) &&
        typeof (
          (obj.data as Record<string, unknown>).attributes as Record<
            string,
            unknown
          >
        ).url === 'string'
      ) {
        return cleanImageUrl(
          (
            (obj.data as Record<string, unknown>).attributes as Record<
              string,
              unknown
            >
          ).url as string
        )
      }

      if (
        obj.attributes &&
        typeof obj.attributes === 'object' &&
        typeof (obj.attributes as Record<string, unknown>).url === 'string'
      ) {
        return cleanImageUrl(
          (obj.attributes as Record<string, unknown>).url as string
        )
      }
    }

    return undefined
  }

  const mobileSrc = getMediaUrl(image)
  const desktopSrc = getMediaUrl(imageDesktop)
  const [currentImageSrc, setCurrentImageSrc] = useState<string | undefined>(
    mobileSrc
  )
  const [isDesktopViewport, setIsDesktopViewport] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [areGifsPaused, setAreGifsPaused] = useState(false)
  const [asyncGifStill, setAsyncGifStill] = useState<{
    url: string
    src: string
  } | null>(null)
  const [viewportKey, setViewportKey] = useState(0) // force re-render on viewport change
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const backgroundStyles: React.CSSProperties = {}
  const prevStylesRef = useRef<Record<string, string | null>>({})

  const currentSize = isDesktopViewport && desktopSrc ? sizeDesktop : sizeMobile
  const currentPosition =
    isDesktopViewport && desktopSrc ? positionDesktop : positionMobile
  const pauseCurrentGif = areGifsPaused && isGifUrl(currentImageSrc)
  const gifStillSrc = (() => {
    if (!currentImageSrc || !isGifUrl(currentImageSrc)) return undefined
    const cached = gifStillCache.get(currentImageSrc)
    if (cached) return cached
    if (asyncGifStill?.url === currentImageSrc) return asyncGifStill.src
    return undefined
  })()

  useEffect(() => {
    if (!currentImageSrc || !isGifUrl(currentImageSrc)) return
    if (gifStillCache.has(currentImageSrc)) return

    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      if (cancelled) return

      try {
        const canvas = document.createElement('canvas')
        const width = img.naturalWidth || img.width
        const height = img.naturalHeight || img.height
        if (!width || !height) return

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Draw first decodable frame from the GIF into a static image.
        ctx.drawImage(img, 0, 0, width, height)
        const still = canvas.toDataURL('image/png')
        gifStillCache.set(currentImageSrc, still)
        setAsyncGifStill({ url: currentImageSrc, src: still })
      } catch {
        // undefined is the fallback
      }
    }

    img.src = currentImageSrc

    return () => {
      cancelled = true
      img.src = ''
    }
  }, [currentImageSrc])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const readPaused = () => localStorage.getItem(GIF_PAUSE_STORAGE_KEY) === '1'

    const syncPausedState = (paused: boolean) => {
      setAreGifsPaused(paused)
      document.documentElement.dataset.gifsPaused = paused ? '1' : '0'
    }

    syncPausedState(readPaused())

    const onPauseChange = (event: Event) => {
      const custom = event as CustomEvent<{ paused?: boolean }>
      const next =
        typeof custom.detail?.paused === 'boolean'
          ? custom.detail.paused
          : readPaused()
      syncPausedState(next)
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== GIF_PAUSE_STORAGE_KEY) return
      syncPausedState(readPaused())
    }

    window.addEventListener(GIF_PAUSE_EVENT, onPauseChange as EventListener)
    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener(
        GIF_PAUSE_EVENT,
        onPauseChange as EventListener
      )
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // dark mode detection — follow the site's `.dark` class so it stays in sync with ThemeToggle
  useEffect(() => {
    if (typeof window === 'undefined') return
    const root = document.documentElement
    const updateFromClass = () => setIsDarkMode(root.classList.contains('dark'))

    updateFromClass()

    const observer = new MutationObserver(updateFromClass)
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  // responsive image swap
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    // preload desktop image if provided
    let img: HTMLImageElement | null = null
    if (desktopSrc) {
      img = new Image()
      img.src = desktopSrc
    }

    const mql = window.matchMedia('(min-width: 768px)')
    const update = () => {
      const isDesktop = mql.matches
      setIsDesktopViewport(isDesktop)
      const newSrc = isDesktop && desktopSrc ? desktopSrc : mobileSrc
      setCurrentImageSrc(newSrc)
      setViewportKey((prev) => prev + 1) // force re-render
    }
    update()
    if (mql.addEventListener) mql.addEventListener('change', update)
    else mql.addListener(update)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', update)
      else mql.removeListener(update)
      if (img) img.src = ''
    }
  }, [desktopSrc, mobileSrc])

  if (scope === 'section') {
    if (type === 'color' && color) {
      backgroundStyles.background = color
    }

    if (type === 'gradient' && gradient) {
      backgroundStyles.backgroundImage = gradient
    }

    if (type === 'image' && currentImageSrc) {
      const backgroundSrc = pauseCurrentGif ? gifStillSrc : currentImageSrc
      backgroundStyles.backgroundImage = backgroundSrc
        ? `url(${backgroundSrc})`
        : 'none'
      backgroundStyles.backgroundPosition = currentPosition
      backgroundStyles.backgroundSize = currentSize
      backgroundStyles.backgroundRepeat = repeat
      // In section scope, keep background anchored to the section only.
      backgroundStyles.backgroundAttachment = 'scroll'
    }
  }

  useEffect(() => {
    if (scope !== 'global' || typeof document === 'undefined') return

    const body = document.body
    prevStylesRef.current = {
      background: body.style.background || null,
      backgroundImage: body.style.backgroundImage || null,
      backgroundPosition: body.style.backgroundPosition || null,
      backgroundSize: body.style.backgroundSize || null,
      backgroundRepeat: body.style.backgroundRepeat || null,
      backgroundAttachment: body.style.backgroundAttachment || null,
      backgroundColor: body.style.backgroundColor || null,
    }

    if (type === 'color' && color) {
      body.style.background = isDarkMode ? '#000000' : color
    } else if (type === 'gradient' && gradient) {
      body.style.backgroundImage = gradient
    } else if (type === 'image' && currentImageSrc) {
      const backgroundSrc = pauseCurrentGif ? gifStillSrc : currentImageSrc
      body.style.backgroundImage = backgroundSrc
        ? `url(${backgroundSrc})`
        : 'none'
      body.style.backgroundPosition = currentPosition
      body.style.backgroundSize = currentSize
      body.style.backgroundRepeat = repeat
      body.style.backgroundAttachment = fixed ? 'fixed' : 'scroll'
    }

    body.classList.add('hakuna-background-applied')
    // expose current image for debugging
    if (typeof currentImageSrc !== 'undefined') {
      body.dataset.hakunaBg = currentImageSrc || ''
    }

    return () => {
      const prev = prevStylesRef.current
      if (prev.background !== null) body.style.background = prev.background
      else body.style.removeProperty('background')

      if (prev.backgroundImage !== null)
        body.style.backgroundImage = prev.backgroundImage
      else body.style.removeProperty('background-image')

      if (prev.backgroundPosition !== null)
        body.style.backgroundPosition = prev.backgroundPosition
      else body.style.removeProperty('background-position')

      if (prev.backgroundSize !== null)
        body.style.backgroundSize = prev.backgroundSize
      else body.style.removeProperty('background-size')

      if (prev.backgroundRepeat !== null)
        body.style.backgroundRepeat = prev.backgroundRepeat
      else body.style.removeProperty('background-repeat')

      if (prev.backgroundAttachment !== null)
        body.style.backgroundAttachment = prev.backgroundAttachment
      else body.style.removeProperty('background-attachment')

      if (prev.backgroundColor !== null)
        body.style.backgroundColor = prev.backgroundColor
      else body.style.removeProperty('background-color')

      body.classList.remove('hakuna-background-applied')
      try {
        delete body.dataset.hakunaBg
      } catch {}
    }
  }, [
    scope,
    type,
    color,
    gradient,
    currentImageSrc,
    currentPosition,
    currentSize,
    repeat,
    fixed,
    isDarkMode,
    pauseCurrentGif,
    gifStillSrc,
  ])

  if (scope === 'global') {
    if (overlayColor && overlayOpacity && mounted) {
      return createPortal(
        <div
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 5,
            pointerEvents: 'none',
            background: isDarkMode ? '#000000' : overlayColor,
            opacity: isDarkMode ? '0.3' : overlayOpacity,
          }}
        />,
        document.body
      )
    }
    return null
  }

  return (
    <>
      {/* Background layer: covers the viewport and sits behind content */}
      <div
        key={viewportKey}
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: -2,
          pointerEvents: 'none',
          ...backgroundStyles,
        }}
      />

      {/* Optional overlay */}
      {overlayColor && overlayOpacity ? (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: -1,
            pointerEvents: 'none',
            background: overlayColor,
            opacity: overlayOpacity,
          }}
        />
      ) : null}
    </>
  )
}

export default BackgroundBlock
