import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import nextConfig from '../../next.config'

describe('ARD manifest', () => {
  it('publishes an empty catalog until agentic resources are available', async () => {
    const manifest = JSON.parse(
      await readFile(
        new URL('../../public/.well-known/ard.json', import.meta.url),
        'utf8'
      )
    )

    expect(manifest).toEqual({ entries: [] })
  })

  it('maps the legacy discovery URL to the canonical manifest', async () => {
    expect(await nextConfig.rewrites?.()).toContainEqual({
      source: '/.well-known/ai-catalog.json',
      destination: '/.well-known/ard.json',
    })
  })
})
