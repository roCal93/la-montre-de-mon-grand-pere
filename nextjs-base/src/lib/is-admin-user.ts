import type { StrapiUser } from '@/lib/strapi-login'

/**
 * Returns true if the given Strapi user is an admin for the customer space.
 * Priority:
 * 1) Strapi role (type/name)
 * 2) ADMIN_USER_IDS (comma-separated numeric ids)
 * 3) ADMIN_EMAIL (legacy fallback)
 */
export function isAdminUser(user: StrapiUser | null): boolean {
  if (!user) return false

  const roleType = user.role?.type?.trim().toLowerCase() ?? ''
  const roleName = user.role?.name?.trim().toLowerCase() ?? ''
  if (
    roleType === 'admin' ||
    roleType === 'super-admin' ||
    roleName === 'admin' ||
    roleName === 'super admin'
  ) {
    return true
  }

  const adminUserIds = (process.env.ADMIN_USER_IDS || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  if (adminUserIds.includes(String(user.id))) {
    return true
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  if (adminEmail) {
    return user.email.toLowerCase() === adminEmail
  }

  return false
}
