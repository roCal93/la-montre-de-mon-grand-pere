'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'

type GalleryImage = {
  id: number
  url: string
  alternativeText: string | null
}

interface ProductImageGalleryProps {
  images: GalleryImage[]
  name: string
}

export default function ProductImageGallery({
  images,
  name,
}: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const thumbnailsRef = useRef<HTMLDivElement>(null)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomOrigin, setZoomOrigin] = useState('50% 50%')

  const selectedImage = useMemo(
    () => images[selectedIndex] || images[0],
    [images, selectedIndex]
  )

  useEffect(() => {
    const container = thumbnailsRef.current
    if (!container) return

    const activeThumbnail = container.children[selectedIndex] as
      | HTMLElement
      | undefined
    activeThumbnail?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }, [selectedIndex])

  useEffect(() => {
    setIsZoomed(false)
    setZoomOrigin('50% 50%')
  }, [selectedIndex])

  const goToPreviousThumbnail = () => {
    setSelectedIndex((current) =>
      current === 0 ? images.length - 1 : current - 1
    )
  }

  const goToNextThumbnail = () => {
    setSelectedIndex((current) =>
      current === images.length - 1 ? 0 : current + 1
    )
  }

  const handleMainImageMouseMove = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!isZoomed) return

    const bounds = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width) * 100
    const y = ((event.clientY - bounds.top) / bounds.height) * 100
    setZoomOrigin(`${x}% ${y}%`)
  }

  const toggleZoom = () => {
    setIsZoomed((current) => !current)
  }

  return (
    <div className="space-y-3">
      <div
        className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-100"
        onClick={toggleZoom}
        onMouseMove={handleMainImageMouseMove}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            toggleZoom()
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={
          isZoomed ? 'Désactiver le zoom image' : 'Activer le zoom image'
        }
      >
        {selectedImage ? (
          <Image
            src={selectedImage.url}
            alt={selectedImage.alternativeText ?? name}
            fill
            priority
            className={`object-cover transition-transform duration-200 ease-out ${
              isZoomed
                ? 'scale-[1.9] cursor-zoom-out'
                : 'scale-100 cursor-zoom-in'
            }`}
            style={{ transformOrigin: zoomOrigin }}
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        ) : (
          <div className="h-full w-full bg-neutral-200" />
        )}
      </div>

      {images.length > 1 && (
        <div className="relative">
          <button
            type="button"
            onClick={goToPreviousThumbnail}
            aria-label="Défiler les miniatures vers la gauche"
            className="absolute left-0 top-1/2 z-10 flex h-[121px] w-[26px] -translate-y-1/2 items-center justify-center rounded-[10px] bg-[rgba(217,217,217,0.2)] transition hover:bg-[rgba(217,217,217,0.35)]"
          >
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              className="h-4 w-4 fill-black"
            >
              <path d="M12.8 3.4a1 1 0 0 1 0 1.4L7.6 10l5.2 5.2a1 1 0 1 1-1.4 1.4l-5.9-5.9a1 1 0 0 1 0-1.4l5.9-5.9a1 1 0 0 1 1.4 0Z" />
            </svg>
          </button>

          <div
            ref={thumbnailsRef}
            className="flex gap-2 overflow-x-auto px-9 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {images.map((img, index) => {
              const isActive = index === selectedIndex
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  aria-label={`Afficher l'image ${index + 1}`}
                  aria-pressed={isActive}
                  className={`relative aspect-square min-w-[88px] overflow-hidden rounded-lg bg-neutral-100 transition sm:min-w-[110px] ${
                    isActive
                      ? 'ring-2 ring-black ring-offset-1'
                      : 'opacity-85 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={img.alternativeText ?? name}
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={goToNextThumbnail}
            aria-label="Défiler les miniatures vers la droite"
            className="absolute right-0 top-1/2 z-10 flex h-[121px] w-[26px] -translate-y-1/2 items-center justify-center rounded-[10px] bg-[rgba(217,217,217,0.2)] transition hover:bg-[rgba(217,217,217,0.35)]"
          >
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              className="h-4 w-4 fill-black"
            >
              <path d="M7.2 3.4a1 1 0 0 0 0 1.4L12.4 10l-5.2 5.2a1 1 0 1 0 1.4 1.4l5.9-5.9a1 1 0 0 0 0-1.4L8.6 3.4a1 1 0 0 0-1.4 0Z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
