'use client'

import { motion, useReducedMotion } from 'framer-motion'

export function FadeIn({ children }: { children: React.ReactNode }) {
  const shouldReduce = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={shouldReduce ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}