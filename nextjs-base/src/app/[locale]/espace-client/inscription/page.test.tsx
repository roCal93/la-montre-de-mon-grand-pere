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

vi.mock('./InscriptionPageClient', () => ({
  InscriptionPageClient: ({ locale }: { locale: string }) => ({
    type: 'InscriptionPageClient',
    props: { locale },
  }),
}))

import InscriptionPage from './page'

describe('InscriptionPage', () => {
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
      InscriptionPage({ params: Promise.resolve({ locale: 'fr' }) })
    ).rejects.toThrow('REDIRECT:/fr/espace-client/tableau-de-bord')
  })

  it('renders the registration client page for unauthenticated users', async () => {
    getCurrentStrapiUserMock.mockResolvedValue(null)

    const result = await InscriptionPage({
      params: Promise.resolve({ locale: 'fr' }),
    })

    expect(result).toMatchObject({
      props: { locale: 'fr' },
    })
    expect((result as { type: { name?: string } }).type.name).toBe(
      'InscriptionPageClient'
    )
    expect(redirectMock).not.toHaveBeenCalled()
  })
})
