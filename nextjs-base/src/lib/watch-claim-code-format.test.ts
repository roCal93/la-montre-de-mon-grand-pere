import { describe, expect, it } from 'vitest'
import {
  formatWatchClaimCodeForDisplay,
  normalizeWatchClaimCodeInput,
} from './watch-claim-code-format'

describe('watch claim code format', () => {
  it('normalizes user input by trimming and removing separators', () => {
    expect(normalizeWatchClaimCodeInput(' cABc-12 3d ')).toBe('cabc123d')
  })

  it('formats normalized value in uppercase groups', () => {
    expect(formatWatchClaimCodeForDisplay('cabc123def456')).toBe(
      'CABC-123D-EF45-6'
    )
  })
})
