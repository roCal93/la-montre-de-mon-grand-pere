import React from 'react'

type HeroProps = {
  title: string
  subtitle?: string
}

export const Hero = ({ title, subtitle }: HeroProps) => (
  <section className="bg-gray-100 py-20 text-center">
    <h1 className="text-4xl font-bold">{title}</h1>
    {subtitle && <p className="mt-4 text-lg text-gray-700">{subtitle}</p>}
  </section>
)
