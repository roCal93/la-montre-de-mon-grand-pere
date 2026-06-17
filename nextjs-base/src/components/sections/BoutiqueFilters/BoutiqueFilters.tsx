'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef } from 'react'

interface Category {
  id: number
  name: string
  slug: string
}

interface CurrentParams {
  categorie?: string
  q?: string
  prixMin?: string
  prixMax?: string
  tri?: string
}

interface BoutiqueFiltersProps {
  locale: string
  catalogueMin: number
  catalogueMax: number
  currentParams: CurrentParams
  categories: Category[]
}

const TRI_FR = [
  { value: 'plus-recent', label: 'Plus récent' },
  { value: 'prix-asc', label: 'Prix ↑' },
  { value: 'prix-desc', label: 'Prix ↓' },
]

const TRI_EN = [
  { value: 'plus-recent', label: 'Most recent' },
  { value: 'prix-asc', label: 'Price ↑' },
  { value: 'prix-desc', label: 'Price ↓' },
]

export function BoutiqueFilters({
  locale,
  catalogueMin,
  catalogueMax,
  currentParams,
  categories,
}: BoutiqueFiltersProps) {
  const router = useRouter()
  const minRef = useRef<HTMLInputElement>(null)
  const maxRef = useRef<HTMLInputElement>(null)

  const isFr = locale === 'fr'
  const triOptions = isFr ? TRI_FR : TRI_EN

  const { q, prixMin, prixMax, tri } = currentParams
  const baseFilterQs = [
    q ? `q=${encodeURIComponent(q)}` : '',
    prixMin ? `prixMin=${prixMin}` : '',
    prixMax ? `prixMax=${prixMax}` : '',
    tri ? `tri=${tri}` : '',
  ]
    .filter(Boolean)
    .join('&')

  const allCategoryHref = `/${locale}/boutique${
    baseFilterQs ? `?${baseFilterQs}` : ''
  }`
  const getCategoryHref = (slug: string) =>
    `/${locale}/boutique?categorie=${slug}${
      baseFilterQs ? `&${baseFilterQs}` : ''
    }`

  const mono =
    'font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.08em]'

  const navigate = (updates: Partial<CurrentParams>) => {
    const merged: Record<string, string | undefined> = {
      ...currentParams,
      ...updates,
    }
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value)
    }
    const qs = params.toString()
    router.push(`/${locale}/boutique${qs ? `?${qs}` : ''}`)
  }

  const handlePriceBlur = () => {
    const min = minRef.current?.value
    const max = maxRef.current?.value
    navigate({ prixMin: min || undefined, prixMax: max || undefined })
  }

  const handleReset = () => {
    const params = new URLSearchParams()
    if (currentParams.q) params.set('q', currentParams.q)
    const qs = params.toString()
    router.push(`/${locale}/boutique${qs ? `?${qs}` : ''}`)
  }

  const hasActiveFilters = !!(
    currentParams.prixMin ||
    currentParams.prixMax ||
    (currentParams.tri && currentParams.tri !== 'plus-recent')
  )

  const hasAnyActive = hasActiveFilters || !!currentParams.categorie

  return (
    <div className="mb-8 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex flex-wrap items-end gap-6">
        {/* Prix */}
        <div className="flex flex-col gap-2">
          <p
            className={`${mono} text-neutral-900 font-semibold dark:text-white`}
          >
            {isFr ? 'Prix (€)' : 'Price (€)'}
          </p>
          <div className="flex items-center gap-2">
            <input
              ref={minRef}
              type="number"
              min={catalogueMin}
              max={catalogueMax}
              defaultValue={currentParams.prixMin ?? ''}
              placeholder={String(catalogueMin)}
              onBlur={handlePriceBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePriceBlur()
              }}
              className={`w-24 border border-neutral-300 bg-white px-3 py-2 ${mono} text-neutral-900 outline-none transition-colors focus:border-black dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-white`}
            />
            <span className={`${mono} text-neutral-400 dark:text-neutral-500`}>
              —
            </span>
            <input
              ref={maxRef}
              type="number"
              min={catalogueMin}
              max={catalogueMax}
              defaultValue={currentParams.prixMax ?? ''}
              placeholder={String(catalogueMax)}
              onBlur={handlePriceBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePriceBlur()
              }}
              className={`w-24 border border-neutral-300 bg-white px-3 py-2 ${mono} text-neutral-900 outline-none transition-colors focus:border-black dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-white`}
            />
          </div>
        </div>

        {/* Tri */}
        <div className="flex flex-col gap-2">
          <p
            className={`${mono} text-neutral-900 font-semibold dark:text-white`}
          >
            {isFr ? 'Trier par' : 'Sort by'}
          </p>
          <div className="relative">
            <select
              value={currentParams.tri ?? 'plus-recent'}
              onChange={(e) =>
                navigate({
                  tri:
                    e.target.value === 'plus-recent'
                      ? undefined
                      : e.target.value,
                })
              }
              className={`w-full cursor-pointer appearance-none border border-neutral-300 bg-white pl-3 pr-9 py-2 ${mono} font-medium text-neutral-900 outline-none transition-colors focus:border-black dark:border-neutral-600 dark:bg-neutral-800 dark:text-white dark:focus:border-white`}
            >
              {triOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400"
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4 6 4 4 4-4"
              />
            </svg>
          </div>
        </div>

        {/* Reset */}
        {hasAnyActive ? (
          <button
            type="button"
            onClick={handleReset}
            className={`self-end border border-neutral-300 px-3 py-2 ${mono} text-neutral-700 transition-colors hover:border-black hover:text-black dark:border-neutral-600 dark:text-neutral-400 dark:hover:border-white dark:hover:text-white`}
          >
            {isFr ? '× Réinitialiser' : '× Reset'}
          </button>
        ) : null}
      </div>

      {/* Catégories */}
      {categories.length > 0 ? (
        <div className="mt-5 border-t border-neutral-100 pt-5 dark:border-neutral-700">
          <p
            className={`mb-2 ${mono} text-neutral-900 font-semibold dark:text-white`}
          >
            {isFr ? 'Catégorie' : 'Category'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={allCategoryHref}
              className={`border px-[10px] py-[4px] ${mono} font-medium transition-colors ${
                !currentParams.categorie
                  ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                  : 'border-neutral-300 text-neutral-700 hover:border-black hover:text-black dark:border-neutral-600 dark:text-neutral-400 dark:hover:border-white dark:hover:text-white'
              }`}
            >
              {isFr ? 'Tout' : 'All'}
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={getCategoryHref(category.slug)}
                className={`border px-[10px] py-[4px] ${mono} font-medium transition-colors ${
                  currentParams.categorie === category.slug
                    ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                    : 'border-neutral-300 text-neutral-700 hover:border-black hover:text-black dark:border-neutral-600 dark:text-neutral-400 dark:hover:border-white dark:hover:text-white'
                }`}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
