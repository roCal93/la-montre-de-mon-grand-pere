import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getCurrentStrapiUserMock, redirectMock } = vi.hoisted(() => ({
  getCurrentStrapiUserMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

vi.mock('@/lib/strapi-session-cookie', () => ({
  getCurrentStrapiUser: getCurrentStrapiUserMock,
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('./ProfilPageClient', () => ({
  ProfilPageClient: () => ({
    type: 'ProfilPageClient',
    props: {},
  }),
}))

import ProfilPage from './page'

describe('ProfilPage', () => {
  beforeEach(() => {
    getCurrentStrapiUserMock.mockReset()
    redirectMock.mockClear()
  })

  it('redirects unauthenticated users to login', async () => {
    getCurrentStrapiUserMock.mockResolvedValue(null)

    await expect(
      ProfilPage({ params: Promise.resolve({ locale: 'fr' }) })
    ).rejects.toThrow('REDIRECT:/fr/espace-client/connexion')
  })

  it('renders the profile client page for authenticated users', async () => {
    getCurrentStrapiUserMock.mockResolvedValue({
      id: 1,
      email: 'client@example.com',
      username: 'client',
    })

    const result = await ProfilPage({
      params: Promise.resolve({ locale: 'fr' }),
    })

    expect(result).toMatchObject({ props: {} })
    expect((result as { type: { name?: string } }).type.name).toBe(
      'ProfilPageClient'
    )
    expect(redirectMock).not.toHaveBeenCalled()
  })
})
