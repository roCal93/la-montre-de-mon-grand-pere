'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { LanguageSwitcher } from '@/components/locale/LanguageSwitcher'
import { scrollToAnchor } from '@/lib/anchor'

interface ProcessedLink {
  slug: string
  label: string
  isHome: boolean
  anchor?: string
}

interface BurgerMenuProps {
  links?: ProcessedLink[]
  currentLocale: string
  hideLanguageSwitcher?: boolean
}

export const BurgerMenu = ({
  links = [],
  currentLocale,
  hideLanguageSwitcher = false,
}: BurgerMenuProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [, setLangOpen] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [headerBottom, setHeaderBottom] = useState(0)
  const pathname = usePathname() ?? '/'
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const updateHeaderBottom = () => {
      const header = document.getElementById('site-header')
      if (header) setHeaderBottom(header.getBoundingClientRect().bottom)
    }
    updateHeaderBottom()
    window.addEventListener('resize', updateHeaderBottom)
    window.addEventListener('scroll', updateHeaderBottom, { passive: true })
    return () => {
      window.removeEventListener('resize', updateHeaderBottom)
      window.removeEventListener('scroll', updateHeaderBottom)
    }
  }, [])

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleOutsideClick = (e: Event) => {
      const target = e.target as Node | null
      if (
        wrapperRef.current &&
        target &&
        !wrapperRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Track current hash to determine active state for anchor links
  const getInitialHash = () =>
    typeof window === 'undefined' ? '' : window.location.hash
  const [currentHash, setCurrentHash] = useState<string>(getInitialHash)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onHashChange = () => setCurrentHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Ensure hash state is synced when the pathname changes (e.g., navigating back to home)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const timeout = window.setTimeout(
      () => setCurrentHash(window.location.hash),
      0
    )
    return () => clearTimeout(timeout)
  }, [pathname])

  // Observe sections on the page and update the currentHash based on the visible section
  useEffect(() => {
    if (typeof window === 'undefined') return

    const anchors = links.map((l) => l.anchor).filter(Boolean) as string[]
    if (!anchors.length) return

    const elements = anchors
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (!elements.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        // pick the most visible intersecting entry
        let bestEntry: IntersectionObserverEntry | null = null
        for (const entry of entries) {
          if (
            !bestEntry ||
            entry.intersectionRatio > bestEntry.intersectionRatio
          ) {
            bestEntry = entry
          }
        }

        if (bestEntry && bestEntry.isIntersecting) {
          setCurrentHash(`#${bestEntry.target.id}`)
        } else {
          // no section is visible enough
          setCurrentHash('')
        }
      },
      { threshold: [0.25, 0.5, 0.75], rootMargin: '0px 0px -40% 0px' }
    )

    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [links, pathname])

  const getLocalizedHref = (slug: string, isHome: boolean, anchor?: string) => {
    const base = isHome ? `/${currentLocale}` : `/${currentLocale}/${slug}`
    return anchor ? `${base}#${anchor}` : base
  }

  const isActive = (slug: string, isHome: boolean, anchor?: string) => {
    const fullHref = getLocalizedHref(slug, isHome, anchor)
    const base = fullHref.split('#')[0]
    if (anchor) {
      // Only consider an anchor link active when the URL hash matches
      return pathname === base && currentHash === `#${anchor}`
    }
    return pathname === base
  }

  const toggleMenu = () => setIsOpen(!isOpen)

  const handleMenuNavClick = (e: React.MouseEvent, link: ProcessedLink) => {
    const href = getLocalizedHref(link.slug, link.isHome, link.anchor)
    const base = href.split('#')[0]
    const currentBase = pathname.split('#')[0]
    if (base === currentBase && link.anchor) {
      e.preventDefault()
      toggleMenu()
      scrollToAnchor(link.anchor)
      if (typeof window !== 'undefined') {
        // Update the URL hash without pushing a new history entry
        window.history.replaceState(null, '', `${base}#${link.anchor}`)
        setCurrentHash(`#${link.anchor}`)
      }
    } else {
      toggleMenu()
    }
  }

  return (
    <div ref={wrapperRef} className="relative min-[850px]:hidden">
      <button
        onClick={toggleMenu}
        className="relative flex justify-center items-center w-8 h-8 cursor-pointer group hover:bg-gray-100/60 hover:scale-105 transition transform duration-150"
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
        aria-haspopup="true"
      >
        <span
          className={`absolute left-1 w-6 h-1 bg-gray-800 rounded-full origin-center transition-all duration-200 ease-in-out ${isOpen ? 'rotate-45' : '-translate-y-2.5'}`}
        ></span>
        <span
          className={`absolute left-1 w-6 h-1 bg-gray-800 rounded-full origin-center transition-all duration-200 ease-in-out ${isOpen ? 'opacity-0' : ''}`}
        ></span>
        <span
          className={`absolute left-1 w-6 h-1 bg-gray-800 group-hover:bg-gray-900 rounded-full origin-center transition-all duration-200 ease-in-out ${isOpen ? '-rotate-45' : 'translate-y-2.5'}`}
        ></span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 cursor-pointer"
            onClick={toggleMenu}
            aria-hidden="true"
          ></div>
          <div
            id="mobile-menu"
            className="fixed right-2 w-64 bg-white/95 backdrop-blur-sm shadow-lg rounded-lg z-50 border border-gray-200"
            style={{ top: headerBottom + 8 }}
            role="dialog"
            aria-label="Mobile navigation menu"
          >
            <nav
              className="flex flex-col"
              role="navigation"
              aria-label="Mobile navigation"
            >
              {links.map((link, index) => {
                const active = isActive(link.slug, link.isHome, link.anchor)
                const hovered = hoveredIndex === index
                return (
                  <React.Fragment key={link.slug || index}>
                    <Link
                      href={getLocalizedHref(
                        link.slug,
                        link.isHome,
                        link.anchor
                      )}
                      prefetch
                      onClick={(e) => handleMenuNavClick(e, link)}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      aria-current={active ? 'page' : undefined}
                      aria-label={
                        link.anchor ? `${link.label} section` : link.label
                      }
                      className={`relative flex items-center justify-center h-14 w-full overflow-hidden text-lg transition-colors ${
                        active ? 'font-semibold text-black' : 'text-gray-700'
                      }`}
                    >
                      <span className="relative z-10">{link.label}</span>
                      <motion.span
                        aria-hidden
                        className="absolute inset-0 z-0 bg-[rgba(217,217,217,0.2)] origin-left"
                        initial={{ scaleX: active || hovered ? 1 : 0 }}
                        animate={{ scaleX: active || hovered ? 1 : 0 }}
                        transition={{
                          type: 'spring',
                          stiffness: 400,
                          damping: 30,
                        }}
                        style={{ transformOrigin: 'left' }}
                      />
                    </Link>
                    {index < links.length - 1 && (
                      <span
                        aria-hidden
                        className="mx-12 h-[1px] bg-gray-500/90"
                      />
                    )}
                  </React.Fragment>
                )
              })}
              {!hideLanguageSwitcher && (
                <div className="py-4 border-t border-gray-200 flex justify-center">
                  <LanguageSwitcher
                    side="right"
                    dropdownDirection="right"
                    centerOpenGroup
                    onOpenChange={(v) => setLangOpen(v)}
                  />
                </div>
              )}
            </nav>
          </div>
        </>
      )}
    </div>
  )
}
