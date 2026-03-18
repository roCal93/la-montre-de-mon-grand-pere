'use client'

import { useEffect } from 'react'

export default function DevPerfProtector(): null {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    try {
      const perf = (globalThis as typeof globalThis).performance
      if (!perf || typeof perf.measure !== 'function') return

      const originalMeasure = perf.measure.bind(perf)

      perf.measure = (...args: Parameters<typeof perf.measure>): PerformanceMeasure => {
        try {
          return originalMeasure(...args)
        } catch (err) {
          // Swallow dev-only errors caused by negative timestamps
          // and log a concise warning to avoid noisy crashes.
          // This is intentionally dev-only and non-intrusive.
          console.warn('DevPerfProtector: ignoring performance.measure error', err)
          // Return a dummy PerformanceMeasure-like object to satisfy the type
          return {
            name: 'DevPerfProtector-dummy',
            entryType: 'measure',
            startTime: 0,
            duration: 0,
            toJSON() {
              return this
            }
          } as PerformanceMeasure
        }
      }
    } catch {
      // ignore
    }
  }, [])

  return null
}
