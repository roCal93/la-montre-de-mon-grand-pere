import React from 'react'

type HeroBlockProps = {
  title?: string
  content: string
  height?: 'little' | 'medium' | 'large' | 'full'
  textAlignment?: 'left' | 'center' | 'right'
}

const HeroBlockSimpleText = ({
  title,
  content,
  height = 'large',
  textAlignment = 'center',
}: HeroBlockProps) => {
  const heightClasses = {
    little: 'min-h-[220px] py-8',
    medium: 'min-h-[550px] py-16',
    large: 'min-h-[750px] py-24',
    full: 'min-h-screen py-32',
  }

  const textAlignmentClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  }

  return (
    <section
      className={`${heightClasses[height]} flex items-center justify-center`}
    >
      <div className="w-full max-w-6xl mx-auto px-4">
        <div
          className={`flex flex-col ${textAlignmentClasses[textAlignment]} gap-6`}
        >
          {title && (
            <h1 className="max-w-4xl text-[30px] font-medium leading-tight tracking-[0.01em] text-neutral-900 sm:text-[38px]">
              {title}
            </h1>
          )}

          <p className="max-w-4xl text-[17px] leading-[1.85] whitespace-pre-line text-neutral-700 sm:text-[18px]">
            {content}
          </p>
        </div>
      </div>
    </section>
  )
}

export default HeroBlockSimpleText
