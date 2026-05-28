import { describe, expect, it, vi } from 'vitest'

import { performLogout } from './logout'

describe('performLogout', () => {
  it('navigates to /{locale} after resetting the session', async () => {
    const resetSession = vi.fn().mockResolvedValue(undefined)
    const navigate = vi.fn()

    const targetUrl = await performLogout({
      locale: 'fr',
      resetSession,
      navigate,
    })

    expect(resetSession).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenCalledWith('/fr')
    expect(targetUrl).toBe('/fr')
  })

  it('still navigates when the reset-session request fails', async () => {
    const resetSession = vi.fn().mockRejectedValue(new Error('network'))
    const navigate = vi.fn()

    await performLogout({
      locale: 'en',
      resetSession,
      navigate,
    })

    expect(navigate).toHaveBeenCalledWith('/en')
  })
})
