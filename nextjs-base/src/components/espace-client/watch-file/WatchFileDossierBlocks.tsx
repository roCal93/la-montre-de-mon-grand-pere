'use client'

import type React from 'react'
import Image from 'next/image'
import BeforeAfterSlider from '@/components/media/BeforeAfterSlider'
import { cleanImageUrl } from '@/lib/strapi'
import {
  extractPlainTextFromStrapiBlocks,
  filterRenderableWatchFileDossierBlocks,
  type WatchFileBeforeAfterDossierBlock,
  type WatchFileDossierBlock,
  type WatchFileRichTextDossierBlock,
  type WatchFileTextImageDossierBlock,
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
        const HeadingTag = `h${Math.min(Math.max(level, 2), 4)}` as const
        const classes = {
          h2: 'text-2xl font-serif font-semibold text-neutral-900 dark:text-white',
          h3: 'text-xl font-serif font-semibold text-neutral-900 dark:text-white',
          h4: 'text-lg font-serif font-semibold text-neutral-900 dark:text-white',
        }

        return (
          <HeadingTag key={index} className={classes[HeadingTag]}>
            {block.children?.map((child, childIndex) =>
              child.type === 'text' || typeof child.text === 'string' ? (
                <span key={childIndex}>{child.text}</span>
              ) : null
            )}
          </HeadingTag>
        )
      }
      case 'list': {
        const ListTag = block.format === 'ordered' ? 'ol' : 'ul'
        const listClass =
          block.format === 'ordered' ? 'list-decimal pl-5' : 'list-disc pl-5'

        return (
          <ListTag
            key={index}
            className={`space-y-2 text-[15px] leading-[1.8] text-neutral-800 dark:text-neutral-200 ${listClass}`}
          >
            {block.children?.map((child, childIndex) => (
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
            ))}
          </ListTag>
        )
      }
      default:
        return null
    }
  })
}

function SectionFrame({
  title,
  children,
}: {
  title?: string | null
  children: React.ReactNode
}) {
  return (
    <section className="mt-6 rounded-[1.75rem] border border-neutral-300 bg-white p-6 shadow-sm shadow-black/5 dark:border-neutral-600 dark:bg-neutral-900 md:p-8">
      {title ? (
        <div className="mb-5">
          <p className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.14em] text-neutral-600 dark:text-neutral-300">
            Dossier narratif
          </p>
          <h2 className="mt-2 text-2xl font-serif font-semibold text-neutral-900 dark:text-white">
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

  if (!beforeUrl || !afterUrl) return null

  return (
    <SectionFrame title={block.title}>
      <BeforeAfterSlider
        locale={locale}
        pairs={[
          {
            beforeUrl,
            afterUrl,
            beforeAlt: block.beforeImage?.alternativeText ?? 'Avant réparation',
            afterAlt: block.afterImage?.alternativeText ?? 'Après réparation',
          },
        ]}
      />
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
        const key = `${block.__component}-${block.id ?? index}`

        switch (block.__component) {
          case 'watch-file.rich-text-block':
            return <RichTextBlock key={key} block={block} />
          case 'watch-file.text-image-block':
            return <TextImageBlock key={key} block={block} />
          case 'watch-file.before-after-block':
            return <BeforeAfterBlock key={key} block={block} locale={locale} />
          default:
            return null
        }
      })}
    </div>
  )
}
