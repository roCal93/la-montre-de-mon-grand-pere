'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { StrapiMedia, StrapiBlock } from '@/types/strapi'
import { cleanImageUrl } from '@/lib/strapi'

type TextImageBlockProps = {
  content: StrapiBlock[]
  images?: StrapiMedia[] | null
  imagePosition: 'left' | 'right'
  imageSize: 'small' | 'medium' | 'large'
  verticalAlignment: 'top' | 'center' | 'bottom'
  textAlignment?: 'left' | 'center' | 'right' | 'justify'
  roundedImage?: boolean
  priority?: boolean
}

const TextImageBlock = ({
  content,
  images,
  imagePosition,
  imageSize,
  verticalAlignment,
  textAlignment = 'left',
  roundedImage = false,
  priority = false,
}: TextImageBlockProps) => {
  const gallery = (images ?? []).filter(Boolean) as StrapiMedia[]

  const [activeIndex, setActiveIndex] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if (activeIndex >= gallery.length) {
      setActiveIndex(0)
    }
  }, [activeIndex, gallery.length])

  useEffect(() => {
    if (!isModalOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isModalOpen])

  const imageSizeClasses = {
    small: 'md:w-1/3',
    medium: 'md:w-1/2',
    large: 'md:w-2/3',
  }

  const roundedImageSizeClasses = {
    small:
      'w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 lg:w-[468px] lg:h-[468px]',
    medium:
      'w-80 h-80 sm:w-96 sm:h-96 md:w-[468px] md:h-[468px] lg:w-[600px] lg:h-[600px]',
    large:
      'w-96 h-96 sm:w-[468px] sm:h-[468px] md:w-[600px] md:h-[600px] lg:w-[800px] lg:h-[800px]',
  }

  const alignmentClasses = {
    top: 'items-start',
    center: 'items-center',
    bottom: 'items-end',
  }

  const textAlignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
  }

  const resolveImageSrc = (media: StrapiMedia) => {
    const imageSrc = cleanImageUrl(media.url)

    return imageSrc && imageSrc.startsWith('/')
      ? `${process.env.NEXT_PUBLIC_STRAPI_URL}${imageSrc}`
      : imageSrc
  }

  const goToPrevious = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? gallery.length - 1 : currentIndex - 1
    )
  }

  const goToNext = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === gallery.length - 1 ? 0 : currentIndex + 1
    )
  }

  const renderBlocks = (blocks: StrapiBlock[]) => {
    return blocks.map((block, index) => {
      switch (block.type) {
        case 'paragraph':
          return (
            <p
              key={index}
              className={`mb-4 text-[14px] leading-[1.85] text-neutral-700 ${textAlignmentClasses[textAlignment]}`}
            >
              {block.children?.map((child, childIndex) => {
                if (child.type === 'text') {
                  let text = <span key={childIndex}>{child.text}</span>
                  if (child.bold)
                    text = <strong key={childIndex}>{child.text}</strong>
                  if (child.italic)
                    text = <em key={childIndex}>{child.text}</em>
                  if (child.underline)
                    text = <u key={childIndex}>{child.text}</u>
                  return text
                }
                return null
              })}
            </p>
          )
        case 'heading':
          const level = block.level || 2
          const HeadingTag = `h${level}` as keyof React.JSX.IntrinsicElements
          const headingClasses = {
            1: 'mb-6 text-[34px] font-medium leading-tight tracking-[0.01em] text-neutral-900',
            2: 'mb-5 text-[30px] font-medium leading-tight tracking-[0.01em] text-neutral-900',
            3: 'mb-4 text-[24px] font-medium leading-snug tracking-[0.01em] text-neutral-900',
            4: 'mb-3 text-[20px] font-medium leading-snug text-neutral-900',
            5: 'mb-2 font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.1em] text-neutral-600',
            6: 'mb-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.1em] text-neutral-600',
          }
          return (
            <HeadingTag
              key={index}
              className={`${headingClasses[level as keyof typeof headingClasses]} ${textAlignmentClasses[textAlignment]}`}
            >
              {block.children?.map((child, childIndex) => {
                if (child.type === 'text') {
                  return <span key={childIndex}>{child.text}</span>
                }
                return null
              })}
            </HeadingTag>
          )
        case 'list':
          const ListTag = block.format === 'ordered' ? 'ol' : 'ul'
          const listClass =
            block.format === 'ordered' ? 'list-decimal' : 'list-disc'
          return (
            <ListTag
              key={index}
              className={`${listClass} mb-4 ml-6 text-[14px] leading-[1.85] text-neutral-700 ${textAlignmentClasses[textAlignment]}`}
            >
              {block.children?.map((child, childIndex) => (
                <li key={childIndex} className="mb-2">
                  {Array.isArray(child.children) &&
                    child.children.map(
                      (
                        grandChild: { type: string; text?: string },
                        grandChildIndex: number
                      ) => {
                        if (grandChild.type === 'text') {
                          return (
                            <span key={grandChildIndex}>{grandChild.text}</span>
                          )
                        }
                        return null
                      }
                    )}
                </li>
              ))}
            </ListTag>
          )
        default:
          return null
      }
    })
  }

  const currentImage = gallery[activeIndex]
  const currentImageSrc = currentImage ? resolveImageSrc(currentImage) : null
  const modal =
    isModalOpen && currentImage && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Image agrandie"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="relative flex max-h-[90vh] w-full max-w-5xl items-center justify-center"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/65 text-2xl text-white transition hover:bg-black/80"
                aria-label="Fermer l'image"
              >
                ×
              </button>
              {gallery.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={goToPrevious}
                    className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-2xl text-white transition hover:bg-black/80"
                    aria-label="Image précédente"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={goToNext}
                    className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-2xl text-white transition hover:bg-black/80"
                    aria-label="Image suivante"
                  >
                    ›
                  </button>
                </>
              ) : null}
              <Image
                src={currentImageSrc || '/placeholder.jpg'}
                alt={currentImage.alternativeText || `Image ${activeIndex + 1}`}
                width={currentImage.width || 1600}
                height={currentImage.height || 1200}
                className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain"
                sizes="100vw"
                priority
              />
              {gallery.length > 1 ? (
                <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.08em] text-white backdrop-blur">
                  {activeIndex + 1} / {gallery.length}
                </div>
              ) : null}
            </div>
          </div>,
          document.body
        )
      : null

  const imageElement = currentImage ? (
    <div
      className={`${roundedImage ? roundedImageSizeClasses[imageSize] : `w-full ${imageSizeClasses[imageSize]}`} flex-shrink-0 mx-auto`}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="block w-full cursor-zoom-in"
          aria-label="Ouvrir l'image en grand"
        >
          <Image
            src={currentImageSrc || '/placeholder.jpg'}
            alt={currentImage.alternativeText || `Image ${activeIndex + 1}`}
            width={roundedImage ? 800 : currentImage.width || 800}
            height={roundedImage ? 800 : currentImage.height || 600}
            className={`${roundedImage ? 'h-full w-full rounded-full object-cover dark:invert' : 'h-auto w-full rounded-2xl border border-neutral-200 object-cover dark:invert'}`}
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={priority && activeIndex === 0}
            loading={priority && activeIndex === 0 ? undefined : 'lazy'}
          />
        </button>

        {gallery.length > 1 ? (
          <>
            <button
              type="button"
              onClick={goToPrevious}
              aria-label="Image précédente"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-black/55 text-lg text-white backdrop-blur transition hover:bg-black/70"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goToNext}
              aria-label="Image suivante"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-black/55 text-lg text-white backdrop-blur transition hover:bg-black/70"
            >
              ›
            </button>
            <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.08em] text-white backdrop-blur">
              {activeIndex + 1} / {gallery.length}
            </div>
          </>
        ) : null}
      </div>
    </div>
  ) : null

  const textElement = (
    <div className="flex-1 border-l-2 border-black pl-4">
      {renderBlocks(content)}
    </div>
  )

  return (
    <>
      <div
        className={`flex flex-col md:flex-row gap-8 my-8 ${alignmentClasses[verticalAlignment]}`}
      >
        {imagePosition === 'left' ? (
          <>
            {imageElement}
            {textElement}
          </>
        ) : (
          <>
            {textElement}
            {imageElement}
          </>
        )}
      </div>
      {modal}
    </>
  )
}

export default TextImageBlock
