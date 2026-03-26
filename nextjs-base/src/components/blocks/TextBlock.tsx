import React from 'react'
import { StrapiBlock } from '@/types/strapi'

type TextBlockProps = {
  content: StrapiBlock[]
  textAlignment?: 'left' | 'center' | 'right' | 'justify'
  blockAlignment?: 'left' | 'center' | 'right' | 'full'
  maxWidth?: 'small' | 'medium' | 'large' | 'full'
}

const TextBlock = ({
  content,
  textAlignment = 'left',
  blockAlignment = 'full',
  maxWidth = 'full',
}: TextBlockProps) => {
  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
  }

  const blockAlignmentClasses = {
    left: 'mr-auto',
    center: 'mx-auto',
    right: 'ml-auto',
    full: 'w-full',
  }

  const maxWidthClasses = {
    small: 'max-w-2xl',
    medium: 'max-w-4xl',
    large: 'max-w-6xl',
    full: 'max-w-none',
  }

  const renderBlocks = (blocks: StrapiBlock[]) => {
    return blocks.map((block, index) => {
      switch (block.type) {
        case 'paragraph':
          return (
            <p
              key={index}
              className={`mb-4 text-[14px] leading-[1.85] text-neutral-700 ${alignmentClasses[textAlignment]}`}
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
              className={`${headingClasses[level as keyof typeof headingClasses]} ${alignmentClasses[textAlignment]}`}
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
              className={`${listClass} mb-4 ml-6 text-[14px] leading-[1.85] text-neutral-700 ${alignmentClasses[textAlignment]}`}
            >
              {block.children?.map((child, childIndex) => (
                <li key={childIndex} className="mb-2">
                  {Array.isArray(child.children) &&
                    child.children.map(
                      (grandChild: StrapiBlock, grandChildIndex: number) => {
                        if (grandChild.type === 'text') {
                          return (
                            <span key={grandChildIndex}>
                              {String(grandChild.text || '')}
                            </span>
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

  return (
    <div
      className={`${blockAlignmentClasses[blockAlignment]} ${maxWidthClasses[maxWidth]}`}
    >
      <div className="max-w-none">{renderBlocks(content)}</div>
    </div>
  )
}

export default TextBlock
