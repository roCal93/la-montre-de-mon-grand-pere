import React from 'react'
import Image from 'next/image'
import { cleanImageUrl } from '@/lib/strapi'
import { StrapiBlock } from '@/types/strapi'

type CardProps = {
  title?: string
  subtitle?: string
  content?: StrapiBlock[]
  image?: string | { url?: string; width?: number; height?: number }
}

export const Card = ({ title, subtitle, content, image }: CardProps) => {
  const imageUrl = typeof image === 'string' ? image : image?.url
  const cleanImage = cleanImageUrl(imageUrl)
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

  return (
    <div
      className={`h-full overflow-hidden rounded-2xl flex flex-col ${isImageOnly ? 'bg-transparent border-0 shadow-none p-0 max-w-none' : 'border border-neutral-200 bg-white p-5 shadow-sm sm:p-6'}`}
    >
      {cleanImage &&
        (isImageOnly ? (
          imgWidth && imgHeight ? (
            <div className="w-full">
              <Image
                src={cleanImage}
                alt={title || 'Card image'}
                width={imgWidth}
                height={imgHeight}
                className="w-full h-auto object-cover rounded-lg"
                sizes="100vw"
                priority
              />
            </div>
          ) : (
            <div className="w-full">
              <Image
                src={cleanImage}
                alt={title || 'Card image'}
                width={imgWidth || 1200}
                height={imgHeight || 800}
                className="w-full h-auto object-cover rounded-lg"
                sizes="100vw"
              />
            </div>
          )
        ) : (
          <div className="relative mb-5 h-44 w-full flex-shrink-0 overflow-hidden rounded-xl bg-neutral-100">
            <Image
              src={cleanImage}
              alt={title || 'Card image'}
              fill
              className="object-cover"
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
  )
}
