'use server'

import { signIn } from '@/auth'
import { AuthError } from 'next-auth'

export async function loginAction(
  email: string,
  password: string,
  redirectTo: string
): Promise<{ error: string } | void> {
  // Prevent open redirect: only allow relative paths within the app
  const safePath =
    redirectTo.startsWith('/') && !redirectTo.startsWith('//')
      ? redirectTo
      : '/fr/espace-client/tableau-de-bord'

  try {
    await signIn('credentials', { email, password, redirectTo: safePath })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Email ou mot de passe incorrect.' }
    }
    // Re-throw NEXT_REDIRECT (successful sign-in) and unexpected errors
    throw error
  }
}
