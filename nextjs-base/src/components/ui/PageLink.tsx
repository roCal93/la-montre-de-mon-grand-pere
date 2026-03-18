'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

type PageLinkProps = {
  slug: string
  locale?: string
  children: React.ReactNode
  prefetch?: boolean
}

export function PageLink({ slug, locale = 'fr', children, prefetch = true }: PageLinkProps) {
  const router = useRouter()

  useEffect(() => {
    if (prefetch) {
      router.prefetch(`/${locale}/${slug}`)
    }
  }, [slug, locale, prefetch, router])

  return (
    <Link href={`/${locale}/${slug}`} prefetch={prefetch}>
      {children}
    </Link>
  )
}