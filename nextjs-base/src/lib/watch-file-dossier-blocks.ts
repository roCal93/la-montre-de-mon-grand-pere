import type { StrapiBlock } from '@/types/strapi'

export interface WatchFileBlockMedia {
  url: string
  alternativeText?: string | null
  width?: number
  height?: number
}

interface BaseWatchFileDossierBlock {
  __component: string
  id?: number
  title?: string | null
}

export interface WatchFileRichTextDossierBlock extends BaseWatchFileDossierBlock {
  __component: 'watch-file.rich-text-block'
  content: StrapiBlock[]
}

export interface WatchFileTextImageDossierBlock extends BaseWatchFileDossierBlock {
  __component: 'watch-file.text-image-block'
  content: StrapiBlock[]
  image: WatchFileBlockMedia | null
  imagePosition?: 'left' | 'right' | null
}

export interface WatchFileBeforeAfterDossierBlock extends BaseWatchFileDossierBlock {
  __component: 'watch-file.before-after-block'
  beforeImage: WatchFileBlockMedia | null
  afterImage: WatchFileBlockMedia | null
}

export type WatchFileDossierBlock =
  | WatchFileRichTextDossierBlock
  | WatchFileTextImageDossierBlock
  | WatchFileBeforeAfterDossierBlock

export function appendWatchFileDossierBlocksPopulate(params: URLSearchParams) {
  // Use [on] syntax only — mixing populate[dossierBlocks]=true with [on] keys
  // causes a qs parse conflict that mangles the result into a broken object.
  params.set(
    'populate[dossierBlocks][on][watch-file.rich-text-block][populate]',
    '*'
  )
  params.set(
    'populate[dossierBlocks][on][watch-file.text-image-block][populate][image]',
    'true'
  )
  params.set(
    'populate[dossierBlocks][on][watch-file.before-after-block][populate][beforeImage]',
    'true'
  )
  params.set(
    'populate[dossierBlocks][on][watch-file.before-after-block][populate][afterImage]',
    'true'
  )
}

function extractNodeText(node: Record<string, unknown> | undefined): string {
  if (!node) return ''

  const directText = typeof node.text === 'string' ? node.text : ''
  const children = Array.isArray(node.children)
    ? node.children
        .map((child) =>
          extractNodeText(child as Record<string, unknown> | undefined)
        )
        .join('')
    : ''

  return `${directText}${children}`
}

export function extractPlainTextFromStrapiBlocks(
  blocks?: StrapiBlock[] | null
) {
  if (!blocks?.length) return ''

  return blocks
    .map((block) =>
      extractNodeText(block as unknown as Record<string, unknown>)
    )
    .map((text) => text.replace(/\s+/g, ' ').trim())
    .filter((text) => text.length > 0)
    .join('\n\n')
}

export function filterRenderableWatchFileDossierBlocks(
  blocks?: WatchFileDossierBlock[] | null
) {
  return (blocks ?? []).filter((block) => {
    const hasTitle =
      typeof block.title === 'string' && block.title.trim().length > 0

    if (block.__component === 'watch-file.rich-text-block') {
      return (
        hasTitle || extractPlainTextFromStrapiBlocks(block.content).length > 0
      )
    }

    if (block.__component === 'watch-file.text-image-block') {
      return (
        hasTitle ||
        extractPlainTextFromStrapiBlocks(block.content).length > 0 ||
        Boolean(block.image?.url)
      )
    }

    if (block.__component === 'watch-file.before-after-block') {
      return (
        hasTitle || Boolean(block.beforeImage?.url && block.afterImage?.url)
      )
    }

    return false
  })
}
