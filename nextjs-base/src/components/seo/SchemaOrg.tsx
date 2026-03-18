import React from 'react'

type SchemaOrgProps = {
  type?: 'Organization' | 'ProfessionalService' | 'LocalBusiness'
  name?: string
  description?: string
  url?: string
  logo?: string
  telephone?: string
  email?: string
  address?: string
  areaServed?: string
  priceRange?: string
}

export const SchemaOrg = ({
  type = 'Organization',
  name,
  description,
  url,
  logo,
  telephone,
  email,
  address,
  areaServed,
  priceRange,
}: SchemaOrgProps) => {
  // Build Organization/Service schema
  const organizationSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': type,
    name: name || process.env.NEXT_PUBLIC_SITE_NAME || 'My Company',
    description:
      description ||
      'Professional services and solutions for your business needs',
    url: url || process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
  }

  if (logo) organizationSchema.logo = logo
  if (telephone) organizationSchema.telephone = telephone
  if (email) organizationSchema.email = email
  if (address) organizationSchema.address = address
  if (areaServed) organizationSchema.areaServed = areaServed
  if (priceRange) organizationSchema.priceRange = priceRange

  // Build WebSite schema
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: name || process.env.NEXT_PUBLIC_SITE_NAME || 'My Company',
    url: url || process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
    publisher: {
      '@type': type,
      name: name || process.env.NEXT_PUBLIC_SITE_NAME || 'My Company',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  )
}
