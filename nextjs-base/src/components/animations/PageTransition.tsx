'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const shouldReduce = useReducedMotion()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // Set mounted only once after first client-side render.
    // Defer to next macrotask to avoid synchronous setState in effect (prevents cascading renders).
    const t = setTimeout(() => setIsMounted(true), 0)
    return () => clearTimeout(t)
  }, [])

  // Don't animate on initial server render or first client mount for better LCP
  if (!isMounted) {
    return <div>{children}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={
        shouldReduce ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' }
      }
    >
      {children}
    </motion.div>
  )
}
