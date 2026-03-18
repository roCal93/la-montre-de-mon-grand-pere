import React from 'react'
import Link from 'next/link'
import { cookies, headers } from 'next/headers'

export default async function LocaleDebugPage() {
  let localeCookie: string | null = null

  try {
    const cookieStore = await cookies()
    localeCookie = cookieStore.get('locale')?.value ?? null
  } catch {
    try {
      const cookieHeader = (await headers()).get('cookie') ?? ''
      const match = cookieHeader.match(/(?:^|; )locale=([^;]+)/)
      localeCookie = match ? decodeURIComponent(match[1]) : null
    } catch {
      localeCookie = null
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Debug: locale cookie</h1>
      <pre>{JSON.stringify({ localeCookie }, null, 2)}</pre>
      <p>
        API endpoint: <Link href="/api/debug/locale">/api/debug/locale</Link>
      </p>
    </div>
  )
}
