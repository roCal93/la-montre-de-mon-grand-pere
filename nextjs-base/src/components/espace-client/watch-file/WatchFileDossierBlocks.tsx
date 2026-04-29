'use client'

import type React from 'react'
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
  const imageSrc = cleanImageUrl(block.image?.url)
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
  const imageContent = imageSrc ? (
    <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] border border-neutral-300 bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800">
      <Image
        src={imageSrc}
        alt={block.image?.alternativeText ?? block.title ?? 'Image du dossier'}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 40vw"
      />
    </div>
  ) : null

  return (
    <SectionFrame title={block.title}>
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
  const beforeUrl = cleanImageUrl(block.beforeImage?.url)
  const afterUrl = cleanImageUrl(block.afterImage?.url)
  const renderedContent = block.content ? renderRichText(block.content) : []
  const hasRenderedContent = renderedContent.some(Boolean)
  const plainText = extractPlainTextFromStrapiBlocks(block.content)

  if (!beforeUrl || !afterUrl) return null

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

        <BeforeAfterSlider
          locale={locale}
          pairs={[
            {
              beforeUrl,
              afterUrl,
              beforeAlt:
                block.beforeImage?.alternativeText ?? 'Avant réparation',
              afterAlt: block.afterImage?.alternativeText ?? 'Après réparation',
            },
          ]}
        />
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
