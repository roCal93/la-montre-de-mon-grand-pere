'use client'

interface BackButtonProps {
  locale: string
}

export function BackButton({ locale }: BackButtonProps) {
  return (
    <button
      onClick={() => window.history.back()}
      className="mb-6 flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
    >
      <span aria-hidden="true">←</span>
      {locale === 'en' ? 'Back' : 'Retour'}
    </button>
  )
}
