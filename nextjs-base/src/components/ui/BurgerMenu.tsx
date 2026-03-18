'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { motion, Transition } from 'framer-motion'
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
  const [langOpen, setLangOpen] = useState(false)
  const pathname = usePathname() ?? '/'
  const wrapperRef = useRef<HTMLDivElement | null>(null)

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

  const motionTransition: Transition = langOpen
    ? {
        type: 'spring',
        stiffness: 160,
        damping: 30,
        opacity: { duration: 0.28, delay: 0.08 },
      }
    : {
        type: 'spring',
        stiffness: 200,
        damping: 32,
        opacity: { duration: 0.18 },
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
            className="absolute right-0 top-22 w-64 bg-[rgba(255,241,241,0.9)] shadow-lg rounded-lg z-50 border border-gray-200"
            role="dialog"
            aria-label="Mobile navigation menu"
          >
            <nav
              className="flex flex-col p-4 space-y-2"
              role="navigation"
              aria-label="Mobile navigation"
            >
              {links.map((link, index) => {
                const active = isActive(link.slug, link.isHome, link.anchor)
                return (
                  <Link
                    key={link.slug || index}
                    href={getLocalizedHref(link.slug, link.isHome, link.anchor)}
                    prefetch
                    onClick={(e) => handleMenuNavClick(e, link)}
                    aria-current={active ? 'page' : undefined}
                    aria-label={
                      link.anchor ? `${link.label} section` : link.label
                    }
                  >
                    <Button
                      variant={active ? 'primary' : 'secondary'}
                      className={`w-full ${active ? '!bg-[#F88379] hover:!bg-[#F88379] !text-white' : '!bg-[rgba(250,220,163,0.6)] hover:!bg-[rgba(250,220,163,0.6)] !text-gray-800'} cursor-pointer !shadow-md hover:!shadow-lg ${active ? 'font-semibold' : ''}`}
                    >
                      {link.label}
                    </Button>
                  </Link>
                )
              })}
              {!hideLanguageSwitcher && (
                <motion.div
                  layout
                  initial={false}
                  animate={{ opacity: langOpen ? 1 : 0.9 }}
                  transition={motionTransition}
                  className={`pt-2 border-t border-gray-200 flex ${langOpen ? 'justify-start' : 'justify-center'}`}
                >
                  <motion.div
                    initial={false}
                    animate={{ x: langOpen ? -8 : 0 }}
                    transition={motionTransition}
                    className="inline-flex"
                  >
                    <LanguageSwitcher
                      side="right"
                      onOpenChange={(v) => setLangOpen(v)}
                    />
                  </motion.div>
                </motion.div>
              )}
            </nav>
          </div>
        </>
      )}
    </div>
  )
}
