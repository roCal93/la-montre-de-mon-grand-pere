import React from 'react'

type HeroProps = {
  title: string
  subtitle?: string
}

export const Hero = ({ title, subtitle }: HeroProps) => (
  <section className="bg-white py-14 sm:py-18 lg:py-20">
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
      {subtitle ? (
        <p className="mb-4 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.12em] text-neutral-500">
          {subtitle}
        </p>
      ) : null}
      <h1 className="max-w-4xl text-[30px] font-medium leading-tight tracking-[0.01em] text-neutral-900 sm:text-[38px]">
        {title}
      </h1>
    </div>
  </section>
)
