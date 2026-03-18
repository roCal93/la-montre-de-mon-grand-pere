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
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#F88379] focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#F88379]"
      aria-label="Skip to main content"
    >
      Skip to main content
    </a>
  )
}
