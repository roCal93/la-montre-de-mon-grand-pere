'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import BeforeAfterSlider from '@/components/media/BeforeAfterSlider'
import { cleanImageUrl } from '@/lib/strapi'
import {
  type WatchFileAudioDossierBlock,
  extractPlainTextFromStrapiBlocks,
  filterRenderableWatchFileDossierBlocks,
  getWatchFileDossierBlockAnchor,
  getWatchFileDossierBlockKey,
  type WatchFileBeforeAfterDossierBlock,
  type WatchFileDossierBlock,
  type WatchFileImageDossierBlock,
  type WatchFileRichTextDossierBlock,
  type WatchFileTextImageDossierBlock,
  type WatchFileVideoDossierBlock,
} from '@/lib/watch-file-dossier-blocks'
import type { StrapiBlock } from '@/types/strapi'

function renderPlainTextFallback(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph, index) => (
      <p
        key={`fallback-${index}`}
        className="text-[15px] leading-[1.85] text-neutral-800 dark:text-neutral-200"
      >
        {paragraph}
      </p>
    ))
}

function renderRichText(blocks: StrapiBlock[]) {
  return blocks.map((block, index) => {
    switch (block.type) {
      case 'paragraph':
        return (
          <p
            key={index}
            className="text-[15px] leading-[1.85] text-neutral-800 dark:text-neutral-200"
          >
            {block.children?.map((child, childIndex) => {
              if (child.type !== 'text' && typeof child.text !== 'string') {
                return null
              }

              let content: React.ReactNode = child.text
              if (child.bold) content = <strong>{content}</strong>
              if (child.italic) content = <em>{content}</em>
              if (child.underline) content = <u>{content}</u>

              return <span key={childIndex}>{content}</span>
            })}
          </p>
        )
      case 'heading': {
        const level = Number(block.level ?? 2)
        const content = block.children?.map((child, childIndex) =>
          child.type === 'text' || typeof child.text === 'string' ? (
            <span key={childIndex}>{child.text}</span>
          ) : null
        )

        if (level >= 4) {
          return (
            <h4
              key={index}
              className="text-lg font-serif font-semibold text-neutral-900 dark:text-white"
            >
              {content}
            </h4>
          )
        }

        if (level === 3) {
          return (
            <h3
              key={index}
              className="text-xl font-serif font-semibold text-neutral-900 dark:text-white"
            >
              {content}
            </h3>
          )
        }

        return (
          <h2
            key={index}
            className="text-2xl font-serif font-semibold text-neutral-900 dark:text-white"
          >
            {content}
          </h2>
        )
      }
      case 'list': {
        const listClass =
          block.format === 'ordered' ? 'list-decimal pl-5' : 'list-disc pl-5'
        const content = block.children?.map((child, childIndex) => (
          <li key={childIndex}>
            {Array.isArray(child.children)
              ? child.children.map((grandChild, grandChildIndex) =>
                  grandChild.type === 'text' ||
                  typeof grandChild.text === 'string' ? (
                    <span key={grandChildIndex}>{grandChild.text}</span>
                  ) : null
                )
              : null}
          </li>
        ))

        if (block.format === 'ordered') {
          return (
            <ol
              key={index}
              className={`space-y-2 text-[15px] leading-[1.8] text-neutral-800 dark:text-neutral-200 ${listClass}`}
            >
              {content}
            </ol>
          )
        }

        return (
          <ul
            key={index}
            className={`space-y-2 text-[15px] leading-[1.8] text-neutral-800 dark:text-neutral-200 ${listClass}`}
          >
            {content}
          </ul>
        )
      }
      default:
        return null
    }
  })
}

function SectionFrame({
  id,
  title,
  children,
}: {
  id?: string
  title?: string | null
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className="mt-6 scroll-mt-28 rounded-[1.75rem] border border-neutral-300 bg-white p-6 shadow-sm shadow-black/5 dark:border-neutral-600 dark:bg-neutral-900 md:p-8"
    >
      {title ? (
        <div className="mb-5">
          <h2 className="text-2xl font-serif font-semibold text-neutral-900 dark:text-white">
            {title}
          </h2>
        </div>
      ) : null}
      {children}
    </section>
  )
}

function RichTextBlock({ block }: { block: WatchFileRichTextDossierBlock }) {
  const renderedContent = renderRichText(block.content)
  const hasRenderedContent = renderedContent.some(Boolean)
  const plainText = extractPlainTextFromStrapiBlocks(block.content)

  return (
    <SectionFrame title={block.title}>
      <div className="space-y-4">
        {hasRenderedContent
          ? renderedContent
          : renderPlainTextFallback(plainText)}
      </div>
    </SectionFrame>
  )
}

function ImageBlock({ block }: { block: WatchFileImageDossierBlock }) {
  const imageSrc = cleanImageUrl(block.image?.url)

  if (!imageSrc) return null

  return (
    <SectionFrame title={block.title}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] border border-neutral-300 bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800">
        <Image
          src={imageSrc}
          alt={
            block.image?.alternativeText ?? block.title ?? 'Image du dossier'
          }
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 60vw"
        />
      </div>
    </SectionFrame>
  )
}

function TextImageBlock({ block }: { block: WatchFileTextImageDossierBlock }) {
  const gallery = (block.images ?? [])
    .map((image) => {
      const src = cleanImageUrl(image?.url)

      if (!src || !image) {
        return null
      }

      return {
        ...image,
        src,
      }
    })
    .filter(
      (
        image
      ): image is NonNullable<typeof image> & {
        src: string
      } => Boolean(image?.src)
    )
  const [activeIndex, setActiveIndex] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const safeActiveIndex =
    gallery.length === 0 ? 0 : Math.min(activeIndex, gallery.length - 1)

  useEffect(() => {
    if (!isModalOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false)
        return
      }

      if (gallery.length > 1 && event.key === 'ArrowLeft') {
        setActiveIndex((currentIndex) =>
          currentIndex === 0 ? gallery.length - 1 : currentIndex - 1
        )
        return
      }

      if (gallery.length > 1 && event.key === 'ArrowRight') {
        setActiveIndex((currentIndex) =>
          currentIndex === gallery.length - 1 ? 0 : currentIndex + 1
        )
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isModalOpen, gallery.length])

  const renderedContent = renderRichText(block.content)
  const hasRenderedContent = renderedContent.some(Boolean)
  const plainText = extractPlainTextFromStrapiBlocks(block.content)
  const textContent = (
    <div className="space-y-4">
      {hasRenderedContent
        ? renderedContent
        : renderPlainTextFallback(plainText)}
    </div>
  )
  const activeImage = gallery[safeActiveIndex]
  const activeImageCaption = activeImage?.caption?.trim()

  const goToPrevious = () => {
    if (gallery.length === 0) {
      return
    }

    setActiveIndex((currentIndex) =>
      (currentIndex >= gallery.length ? 0 : currentIndex) === 0
        ? gallery.length - 1
        : (currentIndex >= gallery.length ? 0 : currentIndex) - 1
    )
  }

  const goToNext = () => {
    if (gallery.length === 0) {
      return
    }

    setActiveIndex((currentIndex) =>
      (currentIndex >= gallery.length ? 0 : currentIndex) === gallery.length - 1
        ? 0
        : (currentIndex >= gallery.length ? 0 : currentIndex) + 1
    )
  }

  const modal =
    isModalOpen && activeImage && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Image agrandie"
            onClick={() => setIsModalOpen(false)}
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
                src={activeImage.src}
                alt={
                  activeImage.alternativeText ??
                  block.title ??
                  'Image du dossier'
                }
                width={activeImage.width || 1600}
                height={activeImage.height || 1200}
                className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain"
                sizes="100vw"
                priority
              />
              {activeImageCaption ? (
                <p className="max-w-3xl text-center text-sm leading-relaxed text-white/85">
                  {activeImageCaption}
                </p>
              ) : null}
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

  const imageContent = activeImage ? (
    <div className="space-y-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] border border-neutral-300 bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="block h-full w-full cursor-zoom-in"
          aria-label="Ouvrir l'image en grand"
        >
          <Image
            src={activeImage.src}
            alt={
              activeImage.alternativeText ?? block.title ?? 'Image du dossier'
            }
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 40vw"
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

      {activeImageCaption ? (
        <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
          {activeImageCaption}
        </p>
      ) : null}
    </div>
  ) : null

  return (
    <SectionFrame title={block.title}>
      <>
        <div className="grid gap-6 md:grid-cols-2 md:gap-8 md:items-center">
          {block.imagePosition === 'left' ? (
            <>
              {imageContent}
              {textContent}
            </>
          ) : (
            <>
              {textContent}
              {imageContent}
            </>
          )}
        </div>
        {modal}
      </>
    </SectionFrame>
  )
}

function BeforeAfterBlock({
  block,
  locale,
}: {
  block: WatchFileBeforeAfterDossierBlock
  locale: string
}) {
  const validPairs = (block.pairs ?? [])
    .map((pair) => ({
      beforeUrl: cleanImageUrl(pair.beforeImage?.url),
      afterUrl: cleanImageUrl(pair.afterImage?.url),
      beforeAlt: pair.beforeImage?.alternativeText ?? 'Avant réparation',
      afterAlt: pair.afterImage?.alternativeText ?? 'Après réparation',
      label: pair.label ?? undefined,
    }))
    .filter((p): p is typeof p & { beforeUrl: string; afterUrl: string } =>
      Boolean(p.beforeUrl && p.afterUrl)
    )

  const renderedContent = block.content ? renderRichText(block.content) : []
  const hasRenderedContent = renderedContent.some(Boolean)
  const plainText = extractPlainTextFromStrapiBlocks(block.content)

  if (validPairs.length === 0) return null

  return (
    <SectionFrame title={block.title}>
      <div className="space-y-5">
        {hasRenderedContent ? (
          <div className="space-y-4 italic">{renderedContent}</div>
        ) : plainText ? (
          <div className="space-y-4 italic">
            {renderPlainTextFallback(plainText)}
          </div>
        ) : null}

        <BeforeAfterSlider locale={locale} pairs={validPairs} />
      </div>
    </SectionFrame>
  )
}

function MediaText({ blocks }: { blocks?: StrapiBlock[] | null }) {
  const renderedContent = blocks ? renderRichText(blocks) : []
  const hasRenderedContent = renderedContent.some(Boolean)
  const plainText = extractPlainTextFromStrapiBlocks(blocks)

  if (hasRenderedContent) {
    return <div className="space-y-4">{renderedContent}</div>
  }

  if (plainText) {
    return <div className="space-y-4">{renderPlainTextFallback(plainText)}</div>
  }

  return null
}

function VideoBlock({
  block,
  anchorId,
}: {
  block: WatchFileVideoDossierBlock
  anchorId: string
}) {
  const videoUrl = cleanImageUrl(block.video?.url)

  if (!videoUrl) return null

  return (
    <SectionFrame id={anchorId} title={block.title}>
      <div className="space-y-5">
        <MediaText blocks={block.content} />
        <div className="overflow-hidden rounded-[1.5rem] border border-neutral-300 bg-neutral-950 shadow-sm shadow-black/10 dark:border-neutral-600">
          <video
            src={videoUrl}
            controls
            preload="metadata"
            playsInline
            className="block aspect-video w-full bg-black"
          >
            <source src={videoUrl} />
            Votre navigateur ne peut pas lire cette vidéo.
          </video>
        </div>
      </div>
    </SectionFrame>
  )
}

function AudioBlock({
  block,
  anchorId,
}: {
  block: WatchFileAudioDossierBlock
  anchorId: string
}) {
  const audioUrl = cleanImageUrl(block.audio?.url)

  if (!audioUrl) return null

  return (
    <SectionFrame id={anchorId} title={block.title}>
      <div className="space-y-5">
        <MediaText blocks={block.content} />
        <div className="rounded-[1.5rem] border border-neutral-300 bg-neutral-50 p-5 shadow-sm shadow-black/5 dark:border-neutral-600 dark:bg-neutral-800/60">
          <audio src={audioUrl} controls preload="metadata" className="w-full">
            <source src={audioUrl} />
            Votre navigateur ne peut pas lire cet audio.
          </audio>
        </div>
      </div>
    </SectionFrame>
  )
}

export default function WatchFileDossierBlocks({
  blocks,
  locale,
}: {
  blocks: WatchFileDossierBlock[]
  locale: string
}) {
  const filteredBlocks = filterRenderableWatchFileDossierBlocks(blocks)

  if (filteredBlocks.length === 0) return null

  return (
    <div>
      {filteredBlocks.map((block, index) => {
        const key = getWatchFileDossierBlockKey(block, index)
        const anchorId = getWatchFileDossierBlockAnchor(block, index)

        switch (block.__component) {
          case 'watch-file.rich-text-block':
            return <RichTextBlock key={key} block={block} />
          case 'watch-file.image-block':
            return <ImageBlock key={key} block={block} />
          case 'watch-file.text-image-block':
            return <TextImageBlock key={key} block={block} />
          case 'watch-file.before-after-block':
            return <BeforeAfterBlock key={key} block={block} locale={locale} />
          case 'watch-file.video-block':
            return <VideoBlock key={key} block={block} anchorId={anchorId} />
          case 'watch-file.audio-block':
            return <AudioBlock key={key} block={block} anchorId={anchorId} />
          default:
            return null
        }
      })}
    </div>
  )
}
