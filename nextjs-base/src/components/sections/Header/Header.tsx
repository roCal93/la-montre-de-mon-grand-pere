'use client'

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useDeferredValue,
  memo,
} from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { BurgerMenu } from '@/components/ui/BurgerMenu'
import { LanguageSwitcher } from '@/components/locale/LanguageSwitcher'
import { scrollToAnchor, scrollToAnchorWithRetry } from '@/lib/anchor'
import type { StrapiMedia, PageLink } from '@/types/strapi'
import {
  defaultLocale as STATIC_DEFAULT_LOCALE,
  locales as STATIC_LOCALES,
} from '@/lib/locales'

export interface HeaderProps {
  logo?: StrapiMedia
  title?: string
  navigation?: PageLink[]
  hideLanguageSwitcher?: boolean
  variant?: 'default' | 'stacked'
}

export const Header = memo(
  ({
    logo,
    title = 'My Website',
    navigation = [],
    hideLanguageSwitcher = false,
    variant = 'default',
  }: HeaderProps) => {
    const rawPathname = usePathname() ?? '/'
    const pathname = useDeferredValue(rawPathname)
    const segments = pathname.split('/')
    const currentSegment = segments[1]
    const currentLocale =
      currentSegment &&
      (STATIC_LOCALES as readonly string[]).includes(currentSegment)
        ? currentSegment
        : STATIC_DEFAULT_LOCALE

    // Transform PageLink to NavigationLink for easier processing
    const links = useMemo(() => {
      const mappedLinks = navigation
        .filter((link) => link.page?.slug) // Only keep links with valid pages
        .map(
          (
            link: PageLink & {
              section?: { title?: string; identifier?: string }
            }
          ) => {
            const sec = link.section
            return {
              slug: link.page!.slug,
              label: link.customLabel || sec?.title || link.page!.title || '',
              isHome: link.page!.slug === 'home',
              anchor: sec?.identifier,
            }
          }
        )

      const hasBlog = mappedLinks.some((link) => link.slug === 'blog')
      if (!hasBlog) {
        mappedLinks.push({
          slug: 'blog',
          label: currentLocale === 'fr' ? 'Blog' : 'Blog',
          isHome: false,
          anchor: undefined,
        })
      }

      return mappedLinks
    }, [navigation, currentLocale])

    // Removed no-op useEffects for better performance

    const [activeAnchor, setActiveAnchor] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

    const shouldReduceMotion = useReducedMotion()

    useEffect(() => {
      // Set mounted asynchronously to avoid triggering a synchronous state update within the effect
      const timeoutId = window.setTimeout(() => setMounted(true), 0)
      return () => {
        clearTimeout(timeoutId)
        setMounted(false)
      }
    }, [])

    const getLocalizedHref = useCallback(
      (slug: string, isHome: boolean, anchor?: string) => {
        const base = isHome ? `/${currentLocale}` : `/${currentLocale}/${slug}`
        return anchor ? `${base}#${anchor}` : base
      },
      [currentLocale]
    )

    const isActive = (slug: string, isHome: boolean, anchor?: string) => {
      const base = getLocalizedHref(slug, isHome).split('#')[0]
      // If we're on the same base path:
      if (pathname === base) {
        // If link targets an anchor, only consider it active after mount to avoid hydration mismatch
        if (anchor) {
          if (!mounted) return false
          return activeAnchor === anchor
        }
        return true
      }
      return false
    }

    const handleNavClick = (
      e: React.MouseEvent,
      link: { slug: string; isHome: boolean; anchor?: string }
    ) => {
      const href = getLocalizedHref(link.slug, link.isHome, link.anchor)
      const base = href.split('#')[0]
      const currentBase = pathname.split('#')[0]
      if (base === currentBase && link.anchor) {
        e.preventDefault()
        scrollToAnchor(link.anchor)
      }
    }

    useEffect(() => {
      if (typeof window === 'undefined') return

      // If the URL contains a hash after navigation to another page, attempt to scroll to it
      const tryScrollHash = () => {
        const h = window.location.hash
          ? window.location.hash.replace('#', '')
          : ''
        if (h) {
          scrollToAnchorWithRetry(h)
        }
      }

      tryScrollHash()

      // Recompute active anchor on scroll / hashchange
      const anchors = links
        .filter(
          (l) =>
            l.anchor &&
            getLocalizedHref(l.slug, l.isHome).split('#')[0] ===
              pathname.split('#')[0]
        )
        .map((l) => l.anchor!)
      if (anchors.length === 0) {
        // Avoid calling setState synchronously within the effect to prevent cascading renders
        const timeoutId = window.setTimeout(() => setActiveAnchor(null), 0)
        return () => clearTimeout(timeoutId)
      }

      const checkActive = () => {
        let found: string | null = null
        for (const id of anchors) {
          const el = document.getElementById(id)
          if (!el) continue
          const rect = el.getBoundingClientRect()
          if (rect.top <= 150 && rect.bottom > 0) {
            found = id
            break
          }
        }
        setActiveAnchor(found)
      }

      checkActive()
      window.addEventListener('scroll', checkActive, { passive: true })
      window.addEventListener('hashchange', checkActive)
      window.addEventListener('popstate', tryScrollHash)

      return () => {
        window.removeEventListener('scroll', checkActive)
        window.removeEventListener('hashchange', checkActive)
        window.removeEventListener('popstate', tryScrollHash)
      }
    }, [pathname, links, getLocalizedHref])

    const handleLogoClick = (e: React.MouseEvent) => {
      // If we're already on the home page, scroll to top instead of navigating
      if (
        pathname === `/${currentLocale}` ||
        pathname === `/${currentLocale}/`
      ) {
        e.preventDefault()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }

    const isStackedVariant = variant === 'stacked'

    if (isStackedVariant) {
      return (
        <header
          id="site-header"
          role="banner"
          aria-label="Site header"
          className="absolute top-8 left-0 right-0 z-50 p-6"
        >
          <div className="flex items-start justify-between gap-6">
            <Link
              href={`/${currentLocale}`}
              prefetch
              onClick={handleLogoClick}
              aria-label={`${title} - Return to homepage`}
              className="block pl-32"
            >
              {logo ? (
                <Image
                  src={logo.url}
                  alt={logo.alternativeText || title}
                  width={logo.width || 180}
                  height={logo.height || 60}
                  className="cursor-pointer h-32 w-auto"
                  priority
                />
              ) : (
                <h1 className="text-5xl font-caveat cursor-pointer hover:text-gray-600 text-left">
                  {title.split(' ').map((word, i) => (
                    <span key={i} className="block">
                      {word}
                      {i < title.split(' ').length - 1 && ' '}
                    </span>
                  ))}
                </h1>
              )}
            </Link>

            {!hideLanguageSwitcher && (
              <div className="flex-none pr-6">
                <LanguageSwitcher />
              </div>
            )}
          </div>

          <nav
            role="navigation"
            aria-label="Main navigation"
            className="mt-10 flex flex-col gap-6"
          >
            {links.map((link, index) => {
              const active = isActive(link.slug, link.isHome, link.anchor)
              const hovered = hoveredIndex === index
              return (
                <Link
                  key={link.slug || index}
                  href={getLocalizedHref(link.slug, link.isHome, link.anchor)}
                  prefetch
                  onClick={(e) => handleNavClick(e, link)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={
                    link.anchor ? `${link.label} section` : link.label
                  }
                  className={`relative inline-flex items-center h-9 text-lg transition-colors hover:text-gray-600 w-fit ${
                    active ? 'font-semibold text-black' : 'text-gray-700'
                  }`}
                >
                  <span className="z-10">{link.label}</span>
                  <motion.span
                    aria-hidden
                    className="absolute left-0 bottom-0 h-[3px] w-full bg-[#F88379] origin-left transform"
                    initial={
                      shouldReduceMotion
                        ? {}
                        : { scaleX: active || hovered ? 1 : 0 }
                    }
                    animate={
                      shouldReduceMotion
                        ? {}
                        : { scaleX: active || hovered ? 1 : 0 }
                    }
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 30,
                      duration: 0.18,
                    }}
                    style={{ transformOrigin: 'left' }}
                  />
                </Link>
              )
            })}
          </nav>
        </header>
      )
    }

    return (
      <header
        id="site-header"
        role="banner"
        aria-label="Site header"
        className="sticky top-0 z-50 backdrop-blur-sm bg-white/10 border-b border-gray-200 flex justify-center min-[850px]:justify-between items-center p-6"
      >
        <Link
          href={`/${currentLocale}`}
          prefetch
          onClick={handleLogoClick}
          aria-label={`${title} - Return to homepage`}
          className="flex-none min-[850px]:flex-1"
        >
          {logo ? (
            <Image
              src={logo.url}
              alt={logo.alternativeText || title}
              width={logo.width || 180}
              height={logo.height || 60}
              className="cursor-pointer mx-auto min-[850px]:mx-0 h-32 w-auto"
              priority
            />
          ) : (
            <h1 className="text-5xl font-caveat cursor-pointer hover:text-gray-600 text-center mx-auto min-[850px]:text-left min-[850px]:mx-0">
              {title.split(' ').map((word, i) => (
                <span key={i} className="block min-[850px]:inline">
                  {word}
                  {i < title.split(' ').length - 1 && ' '}
                </span>
              ))}
            </h1>
          )}
        </Link>
        <div className="hidden min-[850px]:flex items-center space-x-12">
          <nav
            role="navigation"
            aria-label="Main navigation"
            className="hidden min-[850px]:flex min-[850px]:flex-nowrap min-[850px]:space-x-6"
          >
            {links.map((link, index) => {
              const active = isActive(link.slug, link.isHome, link.anchor)
              const hovered = hoveredIndex === index
              return (
                <Link
                  key={link.slug || index}
                  href={getLocalizedHref(link.slug, link.isHome, link.anchor)}
                  prefetch
                  onClick={(e) => handleNavClick(e, link)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={
                    link.anchor ? `${link.label} section` : link.label
                  }
                  // Relative container for absolute animated underline
                  className={`relative inline-flex items-center h-9 text-lg transition-colors hover:text-gray-600 whitespace-nowrap flex-none ${
                    active ? 'font-semibold text-black' : 'text-gray-700'
                  }`}
                >
                  <span className="z-10">{link.label}</span>
                  <motion.span
                    aria-hidden
                    className="absolute left-0 bottom-0 h-[3px] w-full bg-[#F88379] origin-left transform"
                    initial={
                      shouldReduceMotion
                        ? {}
                        : { scaleX: active || hovered ? 1 : 0 }
                    }
                    animate={
                      shouldReduceMotion
                        ? {}
                        : { scaleX: active || hovered ? 1 : 0 }
                    }
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 30,
                      duration: 0.18,
                    }}
                    style={{ transformOrigin: 'left' }}
                  />
                </Link>
              )
            })}
          </nav>
          {!hideLanguageSwitcher && (
            <div className="hidden min-[850px]:block">
              <LanguageSwitcher />
            </div>
          )}
        </div>
        <div className="min-[850px]:hidden absolute right-6">
          <BurgerMenu
            links={links}
            currentLocale={currentLocale}
            hideLanguageSwitcher={hideLanguageSwitcher}
          />
        </div>
      </header>
    )
  }
)

// Ensure ESLint/react DevTools can identify this component
Header.displayName = 'Header'
