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
  etat?: string
}

interface BoutiqueFiltersProps {
  locale: string
  catalogueMin: number
  catalogueMax: number
  currentParams: CurrentParams
  categories: Category[]
}

const CONDITIONS_FR = [
  { value: 'tous', label: 'Tous' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'tres-bon', label: 'Très bon' },
  { value: 'bon', label: 'Bon' },
]

const CONDITIONS_EN = [
  { value: 'tous', label: 'All' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'tres-bon', label: 'Very good' },
  { value: 'bon', label: 'Good' },
]

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
  const conditions = isFr ? CONDITIONS_FR : CONDITIONS_EN
  const triOptions = isFr ? TRI_FR : TRI_EN

  const { q, prixMin, prixMax, tri, etat } = currentParams
  const baseFilterQs = [
    q ? `q=${encodeURIComponent(q)}` : '',
    prixMin ? `prixMin=${prixMin}` : '',
    prixMax ? `prixMax=${prixMax}` : '',
    tri ? `tri=${tri}` : '',
    etat ? `etat=${etat}` : '',
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
    (currentParams.tri && currentParams.tri !== 'plus-recent') ||
    (currentParams.etat && currentParams.etat !== 'tous')
  )

  const hasAnyActive = hasActiveFilters || !!currentParams.categorie

  return (
    <div className="mb-8 rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-wrap items-end gap-6">
        {/* Prix */}
        <div className="flex flex-col gap-2">
          <p className={`${mono} text-neutral-500`}>
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
              className={`w-24 border border-neutral-300 bg-white px-3 py-2 ${mono} text-neutral-900 outline-none transition-colors focus:border-black`}
            />
            <span className={`${mono} text-neutral-400`}>—</span>
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
              className={`w-24 border border-neutral-300 bg-white px-3 py-2 ${mono} text-neutral-900 outline-none transition-colors focus:border-black`}
            />
          </div>
        </div>

        {/* Tri */}
        <div className="flex flex-col gap-2">
          <p className={`${mono} text-neutral-500`}>
            {isFr ? 'Trier par' : 'Sort by'}
          </p>
          <select
            value={currentParams.tri ?? 'plus-recent'}
            onChange={(e) =>
              navigate({
                tri:
                  e.target.value === 'plus-recent' ? undefined : e.target.value,
              })
            }
            className={`cursor-pointer border border-neutral-300 bg-white px-3 py-2 ${mono} text-neutral-900 outline-none transition-colors focus:border-black`}
          >
            {triOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* État */}
        <div className="flex flex-col gap-2">
          <p className={`${mono} text-neutral-500`}>
            {isFr ? 'État' : 'Condition'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {conditions.map((cond) => {
              const isActive = (currentParams.etat ?? 'tous') === cond.value
              return (
                <button
                  key={cond.value}
                  type="button"
                  onClick={() =>
                    navigate({
                      etat: cond.value === 'tous' ? undefined : cond.value,
                    })
                  }
                  className={`border px-[10px] py-[4px] ${mono} font-medium transition-colors ${
                    isActive
                      ? 'border-black bg-black text-white'
                      : 'border-neutral-300 text-neutral-500 hover:border-black hover:text-black'
                  }`}
                >
                  {cond.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Reset */}
        {hasAnyActive ? (
          <button
            type="button"
            onClick={handleReset}
            className={`self-end border border-neutral-300 px-3 py-2 ${mono} text-neutral-500 transition-colors hover:border-black hover:text-black`}
          >
            {isFr ? '× Réinitialiser' : '× Reset'}
          </button>
        ) : null}
      </div>

      {/* Catégories */}
      {categories.length > 0 ? (
        <div className="mt-5 border-t border-neutral-100 pt-5">
          <p className={`mb-2 ${mono} text-neutral-500`}>
            {isFr ? 'Catégorie' : 'Category'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={allCategoryHref}
              className={`border px-[10px] py-[4px] ${mono} font-medium transition-colors ${
                !currentParams.categorie
                  ? 'border-black bg-black text-white'
                  : 'border-neutral-300 text-neutral-500 hover:border-black hover:text-black'
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
                    ? 'border-black bg-black text-white'
                    : 'border-neutral-300 text-neutral-500 hover:border-black hover:text-black'
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
