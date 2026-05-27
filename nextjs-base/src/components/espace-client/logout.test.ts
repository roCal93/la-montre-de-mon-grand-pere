import { describe, expect, it, vi } from 'vitest'

import { performLogout } from './logout'

describe('performLogout', () => {
  it('navigates to the signOut callback url after resetting the session', async () => {
    const resetSession = vi.fn().mockResolvedValue(undefined)
    const signOutAction = vi.fn().mockResolvedValue({ url: '/fr' })
    const navigate = vi.fn()

    const targetUrl = await performLogout({
      locale: 'fr',
      resetSession,
      signOutAction,
      navigate,
    })

    expect(resetSession).toHaveBeenCalledTimes(1)
    expect(signOutAction).toHaveBeenCalledWith({
      redirect: false,
      callbackUrl: '/fr',
    })
    expect(navigate).toHaveBeenCalledWith('/fr')
    expect(targetUrl).toBe('/fr')
  })

  it('still navigates when the reset-session request fails', async () => {
    const resetSession = vi.fn().mockRejectedValue(new Error('network'))
    const signOutAction = vi.fn().mockResolvedValue({ url: '/en' })
    const navigate = vi.fn()

    await performLogout({
      locale: 'en',
      resetSession,
      signOutAction,
      navigate,
    })

    expect(signOutAction).toHaveBeenCalledWith({
      redirect: false,
      callbackUrl: '/en',
    })
    expect(navigate).toHaveBeenCalledWith('/en')
  })

  it('falls back to the locale home when signOut does not return a url', async () => {
    const navigate = vi.fn()

    const targetUrl = await performLogout({
      locale: 'fr',
      resetSession: vi.fn().mockResolvedValue(undefined),
      signOutAction: vi.fn().mockResolvedValue(null),
      navigate,
    })

    expect(navigate).toHaveBeenCalledWith('/fr')
    expect(targetUrl).toBe('/fr')
  })
})
