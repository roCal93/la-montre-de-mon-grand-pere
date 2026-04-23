import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getCurrentStrapiUserMock } = vi.hoisted(() => ({
  getCurrentStrapiUserMock: vi.fn(),
}))

vi.mock('@/lib/strapi-session-cookie', () => ({
  getCurrentStrapiUser: getCurrentStrapiUserMock,
}))

vi.mock('@/components/layout', () => ({
  Layout: ({
    locale,
    children,
  }: {
    locale: string
    children: React.ReactNode
  }) => ({
    type: 'Layout',
    props: { locale, children },
  }),
}))

vi.mock('@/components/espace-client/EspaceClientSidebar', () => ({
  EspaceClientSidebar: ({ locale }: { locale: string }) => ({
    type: 'EspaceClientSidebar',
    props: { locale },
  }),
}))

import EspaceClientLayout, { generateMetadata } from './layout'

describe('EspaceClientLayout', () => {
  beforeEach(() => {
    getCurrentStrapiUserMock.mockReset()
  })

  it('returns public metadata in french and english', async () => {
    await expect(
      generateMetadata({ params: Promise.resolve({ locale: 'fr' }) })
    ).resolves.toEqual({ title: 'Espace client' })

    await expect(
      generateMetadata({ params: Promise.resolve({ locale: 'en' }) })
    ).resolves.toEqual({ title: 'Customer area' })
  })

  it('wraps unauthenticated users in the public layout', async () => {
    getCurrentStrapiUserMock.mockResolvedValue(null)

    const result = await EspaceClientLayout({
      params: Promise.resolve({ locale: 'fr' }),
      children: 'content',
    })

    expect(result).toMatchObject({
      props: { locale: 'fr', children: 'content' },
    })
    expect((result as { type: { name?: string } }).type.name).toBe('Layout')
  })

  it('renders the private shell for authenticated users', async () => {
    getCurrentStrapiUserMock.mockResolvedValue({
      id: 1,
      email: 'client@example.com',
      username: 'client',
    })

    const result = await EspaceClientLayout({
      params: Promise.resolve({ locale: 'fr' }),
      children: 'content',
    })

    expect(result).toBeTruthy()
  })
})
