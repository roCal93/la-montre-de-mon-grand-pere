import type { StrapiUser } from '@/lib/strapi-login'

/**
 * Returns true if the given Strapi user is the site admin.
 * Detection is email-based via ADMIN_EMAIL env var (server-side only).
 */
export function isAdminUser(user: StrapiUser | null): boolean {
  if (!user) return false
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return false
  return user.email.toLowerCase() === adminEmail.toLowerCase()
}
