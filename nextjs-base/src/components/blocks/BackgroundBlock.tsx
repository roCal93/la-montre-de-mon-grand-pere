'use client'

import React, { useEffect, useRef, useState } from 'react'
import { StrapiMedia } from '@/types/strapi'
import { cleanImageUrl } from '@/lib/strapi'

type BackgroundBlockProps = {
  type: 'color' | 'image' | 'gradient'
  color?: string
  gradient?: string
  image?: StrapiMedia
  imageDesktop?: StrapiMedia
  position?:
    | 'center center'
    | 'top center'
    | 'bottom center'
    | 'left center'
    | 'right center'
  size?: 'cover' | 'contain' | 'auto'
  repeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y'
  fixed?: boolean
  overlayColor?: string
  overlayOpacity?: number
  scope?: 'section' | 'global'
}

function hexToRgba(hex: string, opacity: number) {
  if (!hex) return ''
  if (hex.startsWith('#')) {
    let h = hex.replace('#', '')
    if (h.length === 3) {
      h = h
        .split('')
        .map((c) => c + c)
        .join('')
    }
    const bigint = parseInt(h, 16)
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }
  return hex
}

const BackgroundBlock = ({
  type,
  color,
  gradient,
  image,
  imageDesktop,
  position = 'center center',
  size = 'cover',
  repeat = 'no-repeat',
  fixed = false,
  overlayColor,
  overlayOpacity = 0,
  scope = 'section',
}: BackgroundBlockProps) => {
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
  const [viewportKey, setViewportKey] = useState(0) // force re-render on viewport change
  const backgroundStyles: React.CSSProperties = {}
  const prevStylesRef = useRef<Record<string, string | null>>({})

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
      backgroundStyles.backgroundImage = `url(${currentImageSrc})`
      backgroundStyles.backgroundPosition = position
      backgroundStyles.backgroundSize = size
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
      body.style.background = color
    } else if (type === 'gradient' && gradient) {
      body.style.backgroundImage = gradient
    } else if (type === 'image' && currentImageSrc) {
      body.style.backgroundImage = `url(${currentImageSrc})`
      body.style.backgroundPosition = position
      body.style.backgroundSize = size
      body.style.backgroundRepeat = repeat
      body.style.backgroundAttachment = fixed ? 'fixed' : 'scroll'
    }

    if (overlayColor && overlayOpacity) {
      const overlay = hexToRgba(overlayColor, overlayOpacity)
      if (body.style.backgroundImage && body.style.backgroundImage !== 'none') {
        body.style.backgroundImage = `linear-gradient(${overlay}, ${overlay}), ${body.style.backgroundImage}`
      } else if (type === 'color') {
        body.style.backgroundImage = `linear-gradient(${overlay}, ${overlay})`
      }
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
    position,
    size,
    repeat,
    fixed,
    overlayColor,
    overlayOpacity,
  ])

  if (scope === 'global') return null

  return (
    <>
      {/* Background layer: covers the viewport and sits behind content */}
      <div
        key={viewportKey}
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
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
            zIndex: 1,
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
