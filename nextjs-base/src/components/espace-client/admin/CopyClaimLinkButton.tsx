'use client'

import { useState } from 'react'

export function CopyClaimLinkButton({ claimUrl }: { claimUrl: string }) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(claimUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center border border-neutral-400 px-3 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em] text-neutral-700 transition-colors hover:border-black hover:text-black dark:border-neutral-600 dark:text-neutral-300 dark:hover:border-neutral-300 dark:hover:text-white"
    >
      {copied ? 'Lien copié' : 'Copier lien claim'}
    </button>
  )
}
