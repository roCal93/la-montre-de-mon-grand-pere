import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PAGE_POPULATE, PAGE_SECTIONS_POPULATE } from './page-populate'

interface SchemaAttribute {
  type: string
  component?: string
  components?: string[]
  target?: string
}

interface ContentSchema {
  attributes: Record<string, SchemaAttribute>
}

const schemaRoot = new URL('../../../strapi-base/src/', import.meta.url)

const getSchema = (uid: string): ContentSchema => {
  const [namespace, name] = uid.split('.')
  const path = namespace.startsWith('api::')
    ? `api/${namespace.slice(5)}/content-types/${name}/schema.json`
    : `components/${namespace}/${name}.json`

  return JSON.parse(readFileSync(new URL(path, schemaRoot), 'utf8'))
}

const hasPopulatablePath = (uid: string, segments: string[]): boolean => {
  const [key, ...remaining] = segments
  const attribute = getSchema(uid).attributes[key]
  if (
    !attribute ||
    !['relation', 'component', 'dynamiczone', 'media'].includes(attribute.type)
  ) {
    return false
  }
  if (remaining.length === 0) return true

  if (attribute.type === 'component' && attribute.component) {
    return hasPopulatablePath(attribute.component, remaining)
  }
  if (attribute.type === 'relation' && attribute.target) {
    return hasPopulatablePath(attribute.target, remaining)
  }
  if (attribute.type === 'dynamiczone') {
    return (attribute.components || []).some((component) =>
      hasPopulatablePath(component, remaining)
    )
  }

  return false
}

describe.each(['api::page.page', 'api::blog-article.blog-article'])(
  'section population for %s',
  (uid) => {
    it.each(PAGE_SECTIONS_POPULATE.split(','))(
      'only requests installed fields: %s',
      (path) => {
        expect(hasPopulatablePath(uid, path.split('.'))).toBe(true)
      }
    )

    it('rejects generic block paths absent from this client', () => {
      expect(
        hasPopulatablePath(uid, 'sections.blocks.items.images.image'.split('.'))
      ).toBe(false)
      expect(
        hasPopulatablePath(uid, 'sections.blocks.workItems.image'.split('.'))
      ).toBe(false)
    })
  }
)

describe('PAGE_POPULATE', () => {
  it('preserves SEO media and localization alongside the page sections', () => {
    expect(PAGE_POPULATE.split(',')).toEqual([
      ...PAGE_SECTIONS_POPULATE.split(','),
      'seoImage',
      'localizations',
    ])
  })
})
