'use client'

import React from 'react'

/**
 * Skip to Content link for accessibility
 * Allows keyboard users to bypass navigation and jump directly to main content
 */
export const SkipToContent = () => {
  return (
    <a
      href="#main-content"
      className="pointer-events-none fixed left-4 top-4 z-[100] -translate-y-[140%] rounded-md bg-[#F88379] px-4 py-2 text-white opacity-0 shadow-lg transition-all focus-visible:pointer-events-auto focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#F88379]"
      aria-label="Skip to main content"
    >
      Skip to main content
    </a>
  )
}
