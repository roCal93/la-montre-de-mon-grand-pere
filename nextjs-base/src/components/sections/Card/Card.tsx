'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { cleanImageUrl } from '@/lib/strapi'
import { StrapiBlock, StrapiMedia } from '@/types/strapi'

type CardProps = {
  title?: string
  subtitle?: string
  content?: StrapiBlock[]
  image?: string | StrapiMedia
}

export const Card = ({ title, subtitle, content, image }: CardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const imageUrl = typeof image === 'string' ? image : image?.url
  const cleanImage = cleanImageUrl(imageUrl)
  const imageCaption =
    typeof image === 'object' ? image?.caption?.toString().trim() : ''
  const imgWidth =
    typeof image === 'object' && image?.width ? image.width : undefined
  const imgHeight =
    typeof image === 'object' && image?.height ? image.height : undefined

  // Determine whether content contains any visible text (handles empty blocks)
  const hasVisibleContent = (content || []).some((block) => {
    switch (block.type) {
      case 'paragraph':
      case 'heading':
        return (block.children || []).some(
          (child: { type?: string; text?: string }) =>
            child?.type === 'text' &&
            (child.text || '').toString().trim() !== ''
        )
      default:
        // consider other block types visible by default
        return true
    }
  })

  const isImageOnly = !title && !subtitle && !hasVisibleContent && !!cleanImage

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

  // Fonction pour rendre les blocs Strapi
  const renderBlocks = (blocks: StrapiBlock[]) => {
    return blocks.map((block, index) => {
      switch (block.type) {
        case 'paragraph':
          return (
            <p
              key={index}
              className="mb-4 whitespace-pre-line text-[14px] leading-[1.85] text-neutral-700"
            >
              {block.children?.map((child, childIndex) => {
                if (child.type === 'text') {
                  return <span key={childIndex}>{child.text}</span>
                }
                // Gérer d'autres types d'enfants si nécessaire (bold, italic, etc.)
                return null
              })}
            </p>
          )
        case 'heading':
          const level = block.level || 3
          const HeadingTag = `h${level}` as keyof React.JSX.IntrinsicElements
          return (
            <HeadingTag
              key={index}
              className="mb-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-600"
            >
              {block.children?.map((child, childIndex) => {
                if (child.type === 'text') {
                  return <span key={childIndex}>{child.text}</span>
                }
                return null
              })}
            </HeadingTag>
          )
        // Ajouter d'autres types de blocs si nécessaire
        default:
          return null
      }
    })
  }

  const modal =
    isModalOpen && cleanImage && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 px-4 py-6"
            onClick={() => setIsModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Image de la card'}
          >
            <div
              className="relative flex max-h-[90vh] w-full max-w-5xl flex-col items-center justify-center gap-3"
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
              <Image
                src={cleanImage}
                alt={title || 'Card image'}
                width={imgWidth || 1600}
                height={imgHeight || 1200}
                className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain"
                sizes="100vw"
                priority
              />
              {imageCaption ? (
                <p className="max-w-3xl text-center text-sm leading-relaxed text-white/85">
                  {imageCaption}
                </p>
              ) : null}
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <>
      <div
        className={`h-full overflow-hidden rounded-2xl flex flex-col ${isImageOnly ? 'bg-transparent border-0 shadow-none p-0 max-w-none' : 'border border-neutral-200 bg-white p-5 shadow-sm sm:p-6'}`}
      >
        {cleanImage &&
          (isImageOnly ? (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full cursor-zoom-in bg-transparent text-left"
              aria-label="Ouvrir l'image en grand"
            >
              {imgWidth && imgHeight ? (
                <Image
                  src={cleanImage}
                  alt={title || 'Card image'}
                  width={imgWidth}
                  height={imgHeight}
                  className="w-full h-auto object-cover rounded-lg dark:invert"
                  sizes="100vw"
                  priority
                />
              ) : (
                <Image
                  src={cleanImage}
                  alt={title || 'Card image'}
                  width={imgWidth || 1200}
                  height={imgHeight || 800}
                  className="w-full h-auto object-cover rounded-lg dark:invert"
                  sizes="100vw"
                />
              )}
              {imageCaption ? (
                <p className="mt-3 text-center text-sm leading-relaxed text-neutral-600">
                  {imageCaption}
                </p>
              ) : null}
            </button>
          ) : (
            <div className="relative mb-5 h-44 w-full flex-shrink-0 overflow-hidden rounded-xl bg-neutral-100">
              <Image
                src={cleanImage}
                alt={title || 'Card image'}
                fill
                className="object-cover dark:invert"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          ))}

        {title && (
          <h3 className="whitespace-pre-line text-center text-[20px] font-medium leading-snug tracking-[0.01em] text-neutral-900">
            {title}
          </h3>
        )}
        {subtitle && (
          <h4 className="mt-2 whitespace-pre-line text-center font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-500">
            {subtitle}
          </h4>
        )}
        {hasVisibleContent && (
          <div className="mt-6 flex-grow border-l-2 border-black pl-4">
            {renderBlocks(content || [])}
          </div>
        )}
      </div>
      {modal}
    </>
  )
}
