import { NextResponse } from 'next/server'

const AUTH_COOKIE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'authjs.callback-url',
  '__Secure-authjs.callback-url',
  'authjs.csrf-token',
  '__Host-authjs.csrf-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'next-auth.callback-url',
  '__Secure-next-auth.callback-url',
  'next-auth.csrf-token',
  '__Host-next-auth.csrf-token',
]

export async function POST() {
  const response = NextResponse.json({ ok: true })

  for (const name of AUTH_COOKIE_NAMES) {
    response.cookies.set({
      name,
      value: '',
      path: '/',
      maxAge: 0,
    })
  }

  return response
}
