import { beforeEach, describe, expect, it, vi } from 'vitest'

const { isSupportedLocaleMock, notFoundMock } = vi.hoisted(() => ({
  isSupportedLocaleMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
}))

vi.mock('@/lib/supported-locales', () => ({
  isSupportedLocale: isSupportedLocaleMock,
}))

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}))

vi.mock('@/components/locale', () => ({
  LangSetter: ({ lang }: { lang: string }) => ({
    type: 'LangSetter',
    props: { lang },
  }),
}))

vi.mock('@/components/cart/CartContext', () => ({
  CartProvider: ({ children }: { children: React.ReactNode }) => ({
    type: 'CartProvider',
    props: { children },
  }),
}))

vi.mock('@/components/cart/CartDrawer', () => ({
  CartDrawer: () => ({ type: 'CartDrawer', props: {} }),
}))

vi.mock('@/components/espace-client/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => ({
    type: 'AuthProvider',
    props: { children },
  }),
}))

import LocaleLayout from './layout'

describe('LocaleLayout', () => {
  beforeEach(() => {
    isSupportedLocaleMock.mockReset()
    notFoundMock.mockClear()
  })

  it('calls notFound when locale is unsupported', async () => {
    isSupportedLocaleMock.mockResolvedValue(false)

    await expect(
      LocaleLayout({
        params: Promise.resolve({ locale: 'de' }),
        children: 'content',
      })
    ).rejects.toThrow('NOT_FOUND')
  })

  it('renders the locale shell when locale is supported', async () => {
    isSupportedLocaleMock.mockResolvedValue(true)

    const result = await LocaleLayout({
      params: Promise.resolve({ locale: 'fr' }),
      children: 'content',
    })

    expect(notFoundMock).not.toHaveBeenCalled()
    expect(result).toBeTruthy()
  })
})
