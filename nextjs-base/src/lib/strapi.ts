const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN

type FetchOptions = RequestInit & {
  next?: { revalidate?: number }
  // When true, skip logging a console.warn on non-OK responses (useful for
  // expected 4xx responses during feature-detection calls)
  suppressWarnings?: boolean
}

// Fonction utilitaire Strapi v5 avec gestion du draft, du preview token et de la locale
export async function fetchAPI<T = unknown>(
  path: string,
  {
    draft = false,
    locale,
    next,
    ...options
  }: {
    draft?: boolean
    locale?: string
    next?: { revalidate?: number }
  } & FetchOptions = {}
): Promise<T> {
  if (!STRAPI_URL) {
    throw new Error('STRAPI URL manquante')
  }

  let url = `${STRAPI_URL}/api${path}`

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  // Sélection du token : preview si draft=true et disponible, sinon public
  if (draft && process.env.STRAPI_PREVIEW_TOKEN) {
    headers.Authorization = `Bearer ${process.env.STRAPI_PREVIEW_TOKEN}`
    // Demander les source maps utiles pour le Live Preview
    ;(headers as Record<string, string>)['strapi-encode-source-maps'] = 'true'
    // Pour Strapi preview : demander l'état preview et le status draft
    url += url.includes('?')
      ? '&publicationState=preview&status=draft'
      : '?publicationState=preview&status=draft'
  } else if (STRAPI_TOKEN) {
    headers.Authorization = `Bearer ${STRAPI_TOKEN}`
  }

  // Diagnostic (non-sensitive): when requesting draft, log presence of preview token/secret
  if (draft) {
    const previewTokenPresent = !!process.env.STRAPI_PREVIEW_TOKEN
    const previewSecretPresent = !!process.env.PREVIEW_SECRET
    const tokenLen = process.env.STRAPI_PREVIEW_TOKEN
      ? process.env.STRAPI_PREVIEW_TOKEN.length
      : 0
    try {
      // Keep output non-sensitive: do NOT print token or secret values
      console.info(
        `[diag] Strapi preview request — draft=true — previewTokenPresent=${previewTokenPresent} tokenLen=${tokenLen} previewSecretPresent=${previewSecretPresent} path=${path}`
      )
    } catch {
      // swallow any logging errors in runtime
    }
  }

  // Locale: si fournie, ajouter le paramètre locale
  if (locale) {
    const sep = url.includes('?') ? '&' : '?'
    url += `${sep}locale=${encodeURIComponent(locale)}`
  }

  const res = await fetch(url, {
    headers,
    next: draft ? undefined : (next ?? { revalidate: 60 }),
    ...options,
  })

  const text = await res.text()

  if (!res.ok) {
    // Inclure le body et l'URL dans le warning pour faciliter le debug (limitée à 1000 chars)
    const body = text.length > 1000 ? text.slice(0, 1000) + '...' : text
    if (!(options as FetchOptions)?.suppressWarnings) {
      console.warn(
        `Strapi non OK: ${res.status} ${res.statusText} — ${body} — URL: ${url}`
      )
    }
    // Essayer de renvoyer le JSON quand même, sinon retourner une valeur vide sûre
    try {
      return JSON.parse(text) as T
    } catch {
      return {} as T
    }
  }

  try {
    return JSON.parse(text) as T
  } catch {
    console.warn("Réponse non JSON depuis Strapi, retour d'une valeur vide")
    return {} as T
  }
}

/**
 * Nettoie l'URL d'une image Strapi pour l'optimisation Next.js
 * Convertit les URLs relatives en URLs absolues avec le domaine Strapi
 */
export function cleanImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined

  // Si c'est une URL relative, la convertir en URL absolue avec le domaine Strapi
  if (url.startsWith('/')) {
    const strapiUrl =
      process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'
    return `${strapiUrl}${url}`
  }

  // Pour les URLs absolues, supprimer les paramètres de requête problématiques
  try {
    const urlObj = new URL(url)
    // Supprimer les paramètres qui peuvent causer des problèmes avec Next.js Image
    const paramsToRemove = ['publicationState', 'status']
    paramsToRemove.forEach((param) => urlObj.searchParams.delete(param))
    return urlObj.toString()
  } catch {
    // Si ce n'est pas une URL valide, la retourner telle quelle
    return url
  }
}
