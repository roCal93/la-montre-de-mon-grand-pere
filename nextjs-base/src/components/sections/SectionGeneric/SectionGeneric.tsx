import React from 'react'
import * as Blocks from '@/components/blocks'

type BlocksMap = Record<string, React.ComponentType<Record<string, unknown>>>
const TypedBlocks = Blocks as unknown as BlocksMap

type DynamicBlock = { __component?: string } & Record<string, unknown>

type OpeningDay = {
  dayLabel: string
  isClosedAllDay?: boolean | null
  firstPeriodOpenTime?: string | null
  firstPeriodCloseTime?: string | null
  secondPeriodOpenTime?: string | null
  secondPeriodCloseTime?: string | null
}

type SectionGenericProps = {
  title?: string
  blocks: DynamicBlock[]
  sharedOpeningDays?: OpeningDay[]
  identifier?: string
  locale?: string
  spacingTop?: 'none' | 'small' | 'medium' | 'large'
  spacingBottom?: 'none' | 'small' | 'medium' | 'large'
  containerWidth?: 'small' | 'medium' | 'large' | 'full'
  isFirstSection?: boolean
}

export const SectionGeneric = ({
  identifier,
  title,
  blocks,
  sharedOpeningDays,
  locale,
  spacingTop = 'medium',
  spacingBottom = 'medium',
  containerWidth = 'medium',
  isFirstSection = false,
}: SectionGenericProps) => {
  const localTextMapWithOpeningDays = (blocks || []).find((block) => {
    const component = (block as { __component?: string }).__component
    const days = (block as { openingDays?: unknown }).openingDays
    return component === 'blocks.text-map-block' && Array.isArray(days)
  }) as ({ openingDays?: OpeningDay[] } & DynamicBlock) | undefined

  const openingDaysFromTextMap = localTextMapWithOpeningDays?.openingDays
  const effectiveOpeningDays =
    openingDaysFromTextMap && openingDaysFromTextMap.length > 0
      ? openingDaysFromTextMap
      : sharedOpeningDays

  const sectionScopedBackgroundBlocks = (blocks || []).filter((block) => {
    const raw = (block as { __component?: string }).__component ?? ''
    if (raw !== 'blocks.background-block') return false
    const scope = (block as { scope?: string }).scope ?? 'section'
    return scope !== 'global'
  })

  const contentBlocks = (blocks || []).filter((block) => {
    const raw = (block as { __component?: string }).__component ?? ''
    if (raw !== 'blocks.background-block') return true
    const scope = (block as { scope?: string }).scope ?? 'section'
    return scope === 'global'
  })

  const toPascalStatic = (s: string) =>
    s
      .split('-')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join('')

  // Pre-compute the index of the first image-bearing block for LCP priority (only needed in first section)
  const firstImageBlockIndex = isFirstSection
    ? contentBlocks.findIndex((b) => {
        const raw = (b as { __component?: string }).__component ?? ''
        const key = raw.split('.').pop() || raw
        const name = toPascalStatic(key)
        return name === 'ImageBlock' || name === 'TextImageBlock'
      })
    : -1

  const getContainerWidthClass = (
    width: 'small' | 'medium' | 'large' | 'full'
  ) => {
    switch (width) {
      case 'small':
        return 'max-w-3xl'
      case 'medium':
        return 'max-w-6xl'
      case 'large':
        return 'max-w-7xl'
      case 'full':
        return 'max-w-full'
      default:
        return 'max-w-6xl'
    }
  }
  const renderBlock = (block: DynamicBlock, index: number) => {
    // Try to render a matching React block component from `src/components/blocks`.
    // Component names are generated from Strapi __component like 'blocks.cards-block' -> 'CardsBlock'
    const raw = (block as { __component?: string }).__component ?? ''
    const key = raw.split('.').pop() || raw
    const toPascal = (s: string) =>
      s
        .split('-')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join('')
    const componentName = toPascal(key)
    const BlockComponent = TypedBlocks[componentName] as
      | React.ComponentType<Record<string, unknown>>
      | undefined

    if (BlockComponent) {
      const isReservationBlock = raw === 'blocks.reservation-block'
      const reservationOwnOpeningDays = (block as { openingDays?: unknown })
        .openingDays
      const hasOwnOpeningDays =
        Array.isArray(reservationOwnOpeningDays) &&
        reservationOwnOpeningDays.length > 0
      const blockProps = {
        ...(isReservationBlock &&
        Array.isArray(effectiveOpeningDays) &&
        effectiveOpeningDays.length > 0
          ? {
              ...(block as Record<string, unknown>),
              openingDays: hasOwnOpeningDays
                ? reservationOwnOpeningDays
                : effectiveOpeningDays,
            }
          : (block as Record<string, unknown>)),
        ...(locale ? { locale } : {}),
      }

      // Lazy load CarouselBlock if not first block (above-the-fold optimization)
      const isCarousel = componentName === 'CarouselBlock'
      const shouldLazyLoad = isCarousel && index > 0

      if (shouldLazyLoad) {
        return (
          <div key={index} style={{ minHeight: '300px' }}>
            <React.Suspense
              fallback={
                <div className="h-72 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100" />
              }
            >
              <BlockComponent {...blockProps} />
            </React.Suspense>
          </div>
        )
      }

      // Add priority to the first ImageBlock of the first section (LCP optimization)
      const isLCPImage = index === firstImageBlockIndex
      const finalProps = isLCPImage
        ? { ...blockProps, priority: true }
        : blockProps

      return <BlockComponent key={index} {...finalProps} />
    }

    // Fallback placeholder (starter)
    return (
      <div
        key={index}
        className="rounded-2xl border-2 border-dashed border-neutral-300 p-4"
      >
        <p className="text-center font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-500">
          Block: {block.__component} (placeholder - will be replaced by
          create-hakuna-app)
        </p>
      </div>
    )
  }

  const getTopSpacingClass = (
    spacing: 'none' | 'small' | 'medium' | 'large'
  ) => {
    switch (spacing) {
      case 'none':
        return ''
      case 'small':
        return 'pt-6'
      case 'medium':
        return 'pt-12'
      case 'large':
        return 'pt-24'
      default:
        return 'pt-12'
    }
  }

  const getBottomSpacingClass = (
    spacing: 'none' | 'small' | 'medium' | 'large'
  ) => {
    switch (spacing) {
      case 'none':
        return ''
      case 'small':
        return 'pb-6'
      case 'medium':
        return 'pb-12'
      case 'large':
        return 'pb-24'
      default:
        return 'pb-12'
    }
  }

  return (
    <section
      id={identifier}
      className={`relative ${sectionScopedBackgroundBlocks.length > 0 ? 'overflow-hidden' : ''} ${getTopSpacingClass(spacingTop)} ${getBottomSpacingClass(spacingBottom)} px-4`}
    >
      {sectionScopedBackgroundBlocks.map((block, index) => {
        const SectionBackgroundBlock = TypedBlocks.BackgroundBlock as
          | React.ComponentType<Record<string, unknown>>
          | undefined

        if (!SectionBackgroundBlock) return null

        return (
          <SectionBackgroundBlock
            key={`section-bg-${index}`}
            {...(block as Record<string, unknown>)}
          />
        )
      })}

      <div
        className={`relative z-10 ${getContainerWidthClass(containerWidth)} mx-auto`}
      >
        {title && (
          <h2 className="mb-8 text-center text-[30px] font-medium leading-tight tracking-[0.01em] text-neutral-900 sm:text-[36px]">
            {title}
          </h2>
        )}
        <div className="space-y-6 sm:space-y-8">
          {contentBlocks.map((block, index) => renderBlock(block, index))}
        </div>
      </div>
    </section>
  )
}
