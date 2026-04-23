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

vi.mock('./ConnexionPageClient', () => ({
  ConnexionPageClient: ({ locale }: { locale: string }) => ({
    type: 'ConnexionPageClient',
    props: { locale },
  }),
}))

import ConnexionPage from './page'

describe('ConnexionPage', () => {
  beforeEach(() => {
    getCurrentStrapiUserMock.mockReset()
    redirectMock.mockClear()
  })

  it('redirects authenticated users to dashboard', async () => {
    getCurrentStrapiUserMock.mockResolvedValue({
      id: 1,
      email: 'client@example.com',
      username: 'client',
    })

    await expect(
      ConnexionPage({ params: Promise.resolve({ locale: 'fr' }) })
    ).rejects.toThrow('REDIRECT:/fr/espace-client/tableau-de-bord')
  })

  it('renders the login client page for unauthenticated users', async () => {
    getCurrentStrapiUserMock.mockResolvedValue(null)

    const result = await ConnexionPage({
      params: Promise.resolve({ locale: 'fr' }),
    })

    expect(result).toMatchObject({
      props: { locale: 'fr' },
    })
    expect((result as { type: { name?: string } }).type.name).toBe(
      'ConnexionPageClient'
    )
    expect(redirectMock).not.toHaveBeenCalled()
  })
})
