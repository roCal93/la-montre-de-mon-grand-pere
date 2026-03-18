import { afterEach, describe, expect, it } from 'vitest'
import { isDisableDark } from '../lib/theme'

const OLD = process.env.NEXT_PUBLIC_DISABLE_DARK

afterEach(() => {
  process.env.NEXT_PUBLIC_DISABLE_DARK = OLD
})

describe('isDisableDark', () => {
  it('returns true for "true"', () => {
    process.env.NEXT_PUBLIC_DISABLE_DARK = 'true'
    expect(isDisableDark()).toBe(true)
  })

  it('returns true for "1"', () => {
    process.env.NEXT_PUBLIC_DISABLE_DARK = '1'
    expect(isDisableDark()).toBe(true)
  })

  it('returns false for undefined or falsy values', () => {
    process.env.NEXT_PUBLIC_DISABLE_DARK = undefined
    expect(isDisableDark()).toBe(false)
    process.env.NEXT_PUBLIC_DISABLE_DARK = '0'
    expect(isDisableDark()).toBe(false)
  })
})
