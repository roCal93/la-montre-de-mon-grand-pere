import React from 'react'
import { Card as CardData, StrapiEntity } from '@/types/strapi'
import { Card } from '@/components/sections/Card'

type CardsBlockProps = {
  cards: (CardData & StrapiEntity)[]
  columns: '1' | '2' | '3' | '4'
  alignment?: 'left' | 'center' | 'right'
  overlap?: boolean
}

const CardsBlock = ({
  cards,
  columns,
  alignment = 'center',
  overlap = false,
}: CardsBlockProps) => {
  const columnClasses = {
    '1': 'grid-cols-1 max-w-3xl mx-auto',
    '2': 'grid-cols-1 md:grid-cols-2',
    '3': 'grid-cols-1 md:grid-cols-3',
    '4': 'grid-cols-1 md:grid-cols-4',
  }

  const alignmentClasses = {
    left: 'justify-items-start',
    center: 'justify-items-center',
    right: 'justify-items-end',
  }

  const cardWidthClasses = {
    '1': 'w-full',
    '2': 'w-full',
    '3': 'w-full',
    '4': 'w-full',
  }

  if (overlap) {
    return (
      <div className="mt-8 mb-8 flex flex-col md:flex-row items-center justify-center px-4 sm:px-8 gap-4 md:gap-0">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className={`relative w-full sm:w-96 md:w-80 lg:w-96 xl:w-[28rem] flex-shrink-0 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:scale-[1.01] ${index > 0 ? 'md:-ml-10 lg:-ml-12' : ''}`}
            style={{
              zIndex: index === 0 ? cards.length : cards.length - index,
            }}
          >
            <Card
              title={card.title}
              subtitle={card.subtitle}
              content={card.content || []}
              image={card.image}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={`grid ${columnClasses[columns]} ${alignmentClasses[alignment]} gap-6 mt-12 mb-8`}
    >
      {cards.map((card) => (
        <div key={card.id} className={cardWidthClasses[columns]}>
          <Card
            title={card.title}
            subtitle={card.subtitle}
            content={card.content || []}
            image={card.image}
          />
        </div>
      ))}
    </div>
  )
}

export default CardsBlock
