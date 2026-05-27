import { signOut } from 'next-auth/react'

type PerformLogoutOptions = {
  locale: string
  resetSession?: () => Promise<unknown>
  signOutAction?: typeof signOut
  navigate?: (url: string) => void
}

async function defaultResetSession() {
  await fetch('/api/auth/reset-session', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
  })
}

function defaultNavigate(url: string) {
  window.location.assign(url)
}

export async function performLogout({
  locale,
  resetSession = defaultResetSession,
  signOutAction = signOut,
  navigate = defaultNavigate,
}: PerformLogoutOptions) {
  const callbackUrl = `/${locale}`

  await resetSession().catch(() => undefined)

  const result = await signOutAction({
    redirect: false,
    callbackUrl,
  }).catch(() => null)

  const targetUrl = result?.url ?? callbackUrl
  navigate(targetUrl)

  return targetUrl
}
