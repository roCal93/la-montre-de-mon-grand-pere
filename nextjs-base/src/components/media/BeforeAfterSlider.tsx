'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { createPortal } from 'react-dom'

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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const activePair = pairs[activeIndex]

  if (!activePair) return null

  const beforeAlt = activePair.beforeAlt ?? 'Avant réparation'
  const afterAlt = activePair.afterAlt ?? 'Après réparation'

  useEffect(() => {
    if (!isModalOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false)
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isModalOpen])

  const setPos = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return

    const pct = Math.min(
      Math.max(((clientX - rect.left) / rect.width) * 100, 2),
      98
    )
    setPosition(pct)
  }

  const renderComparisonSurface = ({
    className,
    showZoomButton,
  }: {
    className: string
    showZoomButton: boolean
  }) => {
    return (
      <div
        ref={wrapRef}
        className={className}
        style={{ touchAction: 'none' }}
        onPointerDown={(event) => {
          event.preventDefault()
          dragging.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
          setPos(event.clientX)
        }}
        onPointerMove={(event) => {
          if (dragging.current) setPos(event.clientX)
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
        {showZoomButton ? (
          <button
            type="button"
            onPointerDown={(event) => {
              event.stopPropagation()
            }}
            onClick={() => setIsModalOpen(true)}
            className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75"
            aria-label={
              locale === 'fr' ? 'Ouvrir la vue en grand' : 'Open expanded view'
            }
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                d="M8 4H4v4M12 4h4v4M16 12v4h-4M4 12v4h4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}

        <Image
          src={activePair.afterUrl}
          alt={afterAlt}
          fill
          className="pointer-events-none object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1200px"
          quality={85}
          draggable={false}
        />

        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <Image
            src={activePair.beforeUrl}
            alt={beforeAlt}
            fill
            className="pointer-events-none object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1200px"
            quality={85}
            draggable={false}
          />
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-black"
          style={{ left: `${position}%` }}
        />

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

        <span className="pointer-events-none absolute bottom-3 left-3 border border-neutral-300 bg-white px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
          {locale === 'fr' ? 'Avant' : 'Before'}
        </span>
        <span className="pointer-events-none absolute bottom-3 right-3 bg-black px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-white">
          {locale === 'fr' ? 'Après' : 'After'}
        </span>
      </div>
    )
  }

  const modal =
    isModalOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[220] flex items-center justify-center bg-black/88 px-4 py-6"
            onClick={() => setIsModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={
              locale === 'fr'
                ? 'Comparatif avant après en grand'
                : 'Expanded before after comparison'
            }
          >
            <div
              className="relative flex max-h-[92vh] w-full max-w-7xl flex-col gap-4 overflow-auto rounded-[28px] bg-neutral-950/96 p-4 text-white shadow-2xl sm:p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-2xl text-white transition hover:bg-white/20"
                aria-label={
                  locale === 'fr'
                    ? 'Fermer la vue en grand'
                    : 'Close expanded view'
                }
              >
                ×
              </button>

              {renderComparisonSurface({
                className:
                  'relative aspect-[16/9] w-full select-none overflow-hidden rounded-[24px] border border-white/10 bg-neutral-100',
                showZoomButton: false,
              })}

              <p className="text-center text-sm font-medium text-white/70">
                {locale === 'fr'
                  ? 'Glissez pour comparer les deux vues en grand format'
                  : 'Drag to compare both images in the expanded view'}
              </p>
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <>
      <div className="space-y-4">
        {renderComparisonSurface({
          className:
            'relative aspect-[16/9] w-full select-none overflow-hidden border border-neutral-200 bg-neutral-100',
          showZoomButton: true,
        })}

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

        <p className="text-center font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.12em] text-neutral-500">
          {locale === 'fr'
            ? 'Cliquez sur la loupe pour afficher les images en grand'
            : 'Use the zoom button to open the images in high definition'}
        </p>
      </div>

      {modal}
    </>
  )
}
