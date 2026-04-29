import type { StrapiBlock } from '@/types/strapi'

export interface WatchFileBlockMedia {
  url: string
  mime?: string
  alternativeText?: string | null
  caption?: string | null
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

export interface WatchFileImageDossierBlock extends BaseWatchFileDossierBlock {
  __component: 'watch-file.image-block'
  image: WatchFileBlockMedia | null
}

export interface WatchFileTextImageDossierBlock extends BaseWatchFileDossierBlock {
  __component: 'watch-file.text-image-block'
  content: StrapiBlock[]
  image: WatchFileBlockMedia | null
  imagePosition?: 'left' | 'right' | null
}

export interface WatchFileBeforeAfterDossierBlock extends BaseWatchFileDossierBlock {
  __component: 'watch-file.before-after-block'
  content?: StrapiBlock[] | null
  beforeImage: WatchFileBlockMedia | null
  afterImage: WatchFileBlockMedia | null
}

export interface WatchFileVideoDossierBlock extends BaseWatchFileDossierBlock {
  __component: 'watch-file.video-block'
  content?: StrapiBlock[] | null
  video: WatchFileBlockMedia | null
}

export interface WatchFileAudioDossierBlock extends BaseWatchFileDossierBlock {
  __component: 'watch-file.audio-block'
  content?: StrapiBlock[] | null
  audio: WatchFileBlockMedia | null
}

export type WatchFileDossierBlock =
  | WatchFileRichTextDossierBlock
  | WatchFileImageDossierBlock
  | WatchFileTextImageDossierBlock
  | WatchFileBeforeAfterDossierBlock
  | WatchFileVideoDossierBlock
  | WatchFileAudioDossierBlock

export function getWatchFileDossierBlockKey(
  block: WatchFileDossierBlock,
  index: number
) {
  return `${block.__component}-${block.id ?? index}`
}

export function getWatchFileDossierBlockAnchor(
  block: WatchFileDossierBlock,
  index: number
) {
  return `dossier-${getWatchFileDossierBlockKey(block, index)
    .replace(/[^a-z0-9-]/gi, '-')
    .toLowerCase()}`
}

export function appendWatchFileDossierBlocksPopulate(params: URLSearchParams) {
  // Use [on] syntax only — mixing populate[dossierBlocks]=true with [on] keys
  // causes a qs parse conflict that mangles the result into a broken object.
  params.set(
    'populate[dossierBlocks][on][watch-file.rich-text-block][populate]',
    '*'
  )
  params.set(
    'populate[dossierBlocks][on][watch-file.image-block][populate][image]',
    'true'
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
  params.set(
    'populate[dossierBlocks][on][watch-file.video-block][populate][video]',
    'true'
  )
  params.set(
    'populate[dossierBlocks][on][watch-file.audio-block][populate][audio]',
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

    if (block.__component === 'watch-file.image-block') {
      return hasTitle || Boolean(block.image?.url)
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
        hasTitle ||
        extractPlainTextFromStrapiBlocks(block.content).length > 0 ||
        Boolean(block.beforeImage?.url && block.afterImage?.url)
      )
    }

    if (block.__component === 'watch-file.video-block') {
      return (
        hasTitle ||
        extractPlainTextFromStrapiBlocks(block.content).length > 0 ||
        Boolean(block.video?.url)
      )
    }

    if (block.__component === 'watch-file.audio-block') {
      return (
        hasTitle ||
        extractPlainTextFromStrapiBlocks(block.content).length > 0 ||
        Boolean(block.audio?.url)
      )
    }

    return false
  })
}
