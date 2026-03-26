'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'

interface Props {
  pairs: Array<{
    beforeUrl: string
    afterUrl: string
    beforeAlt?: string
    afterAlt?: string
  }>
  locale?: string
}

export default function BeforeAfterSlider({ pairs, locale = 'fr' }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [position, setPosition] = useState(50)
  const wrapRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const activePair = pairs[activeIndex]

  if (!activePair) return null

  const beforeAlt = activePair.beforeAlt ?? 'Avant restauration'
  const afterAlt = activePair.afterAlt ?? 'Après restauration'

  const setPos = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = Math.min(
      Math.max(((clientX - rect.left) / rect.width) * 100, 2),
      98
    )
    setPosition(pct)
  }

  return (
    <div className="space-y-4">
      <div
        ref={wrapRef}
        className="relative aspect-[16/9] w-full select-none overflow-hidden border border-neutral-200 bg-neutral-100"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          e.preventDefault()
          dragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          setPos(e.clientX)
        }}
        onPointerMove={(e) => {
          if (dragging.current) setPos(e.clientX)
        }}
        onPointerUp={() => {
          dragging.current = false
        }}
        onPointerCancel={() => {
          dragging.current = false
        }}
        onLostPointerCapture={() => {
          dragging.current = false
        }}
      >
        {/* After (full) */}
        <Image
          src={activePair.afterUrl}
          alt={afterAlt}
          fill
          className="pointer-events-none object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
          draggable={false}
        />

        {/* Before (clipped to left side) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <Image
            src={activePair.beforeUrl}
            alt={beforeAlt}
            fill
            className="pointer-events-none object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            draggable={false}
          />
        </div>

        {/* Divider line */}
        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-black"
          style={{ left: `${position}%` }}
        />

        {/* Handle */}
        <div
          className="pointer-events-none absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-black"
          style={{ left: `${position}%` }}
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
            <path
              d="M5 8H11M5 8L3 6M5 8L3 10M11 8L13 6M11 8L13 10"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Tags */}
        <span className="pointer-events-none absolute bottom-3 left-3 border border-neutral-300 bg-white px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-500">
          {locale === 'fr' ? 'Avant' : 'Before'}
        </span>
        <span className="pointer-events-none absolute bottom-3 right-3 bg-black px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-white">
          {locale === 'fr' ? 'Après' : 'After'}
        </span>
      </div>

      {pairs.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {pairs.map((pair, idx) => (
            <button
              key={`${pair.beforeUrl}-${pair.afterUrl}`}
              type="button"
              onClick={() => {
                setActiveIndex(idx)
                setPosition(50)
              }}
              className={`relative h-16 w-24 overflow-hidden border transition-colors ${
                idx === activeIndex
                  ? 'border-black'
                  : 'border-neutral-300 hover:border-neutral-500'
              }`}
              aria-label={`${locale === 'fr' ? 'Comparer la paire' : 'Compare pair'} ${idx + 1}`}
            >
              <Image
                src={pair.afterUrl}
                alt={pair.afterAlt ?? `After ${idx + 1}`}
                fill
                className="object-cover"
                sizes="96px"
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
