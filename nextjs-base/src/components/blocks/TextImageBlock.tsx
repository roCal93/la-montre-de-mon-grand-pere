import React from 'react'
import Image from 'next/image'
import { StrapiMedia, StrapiBlock } from '@/types/strapi'
import { cleanImageUrl } from '@/lib/strapi'

type TextImageBlockProps = {
  content: StrapiBlock[]
  image: StrapiMedia
  imagePosition: 'left' | 'right'
  imageSize: 'small' | 'medium' | 'large'
  verticalAlignment: 'top' | 'center' | 'bottom'
  textAlignment?: 'left' | 'center' | 'right' | 'justify'
  roundedImage?: boolean
  priority?: boolean
}

const TextImageBlock = ({
  content,
  image,
  imagePosition,
  imageSize,
  verticalAlignment,
  textAlignment = 'left',
  roundedImage = false,
  priority = false,
}: TextImageBlockProps) => {
  const imageSrc = cleanImageUrl(image.url)
  const finalImageSrc =
    imageSrc && imageSrc.startsWith('/')
      ? `${process.env.NEXT_PUBLIC_STRAPI_URL}${imageSrc}`
      : imageSrc

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

  const imageElement = (
    <div
      className={`${roundedImage ? roundedImageSizeClasses[imageSize] : `w-full ${imageSizeClasses[imageSize]}`} flex-shrink-0 mx-auto`}
    >
      <Image
        src={finalImageSrc || '/placeholder.jpg'}
        alt={image.alternativeText || 'Image'}
        width={roundedImage ? 800 : image.width || 800}
        height={roundedImage ? 800 : image.height || 600}
        className={`${roundedImage ? 'h-full w-full rounded-full object-cover dark:invert' : 'h-auto w-full rounded-2xl border border-neutral-200 object-cover dark:invert'}`}
        sizes="(max-width: 768px) 100vw, 50vw"
        priority={priority}
        loading={priority ? undefined : 'lazy'}
      />
    </div>
  )

  const textElement = (
    <div className="flex-1 border-l-2 border-black pl-4">
      {renderBlocks(content)}
    </div>
  )

  return (
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
  )
}

export default TextImageBlock
