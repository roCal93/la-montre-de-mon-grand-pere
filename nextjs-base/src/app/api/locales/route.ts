import { NextResponse } from 'next/server'
import { getLocalesConfig } from '@/lib/supported-locales'

export async function GET() {
  const { locales, defaultLocale } = await getLocalesConfig()
  return NextResponse.json(
    { locales, defaultLocale },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=3600',
      },
    }
  )
}
