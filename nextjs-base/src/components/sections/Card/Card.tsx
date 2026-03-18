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
            <p key={index} className="text-gray-600 mb-2 whitespace-pre-line">
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
            <HeadingTag key={index} className="text-gray-600 mb-2">
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
      className={`rounded-lg overflow-hidden h-full flex flex-col ${isImageOnly ? 'bg-transparent border-0 shadow-none p-0 max-w-none' : 'border shadow p-4 bg-white'}`}
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
          <div className="relative w-full h-40 mb-4 flex-shrink-0">
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
        <h3 className="text-xl font-semibold whitespace-pre-line">{title}</h3>
      )}
      {subtitle && (
        <h4 className="text-sm text-gray-700 mt-1 whitespace-pre-line">
          {subtitle}
        </h4>
      )}
      {hasVisibleContent && (
        <div className="mt-2 flex-grow">{renderBlocks(content || [])}</div>
      )}
    </div>
  )
}
