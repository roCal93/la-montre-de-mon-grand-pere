/**
 * Utilitaires pour les requêtes à l'API Strapi
 * Fonctions typées pour faciliter les appels API
 */

import type {
  StrapiResponse,
  StrapiCollectionResponse,
  StrapiErrorResponse,
} from '@/types/strapi'

/**
 * Options de requête Strapi
 */
export interface StrapiQueryOptions {
  populate?: string | string[] | Record<string, unknown>
  filters?: Record<string, unknown>
  sort?: string | string[]
  pagination?: {
    page?: number
    pageSize?: number
    start?: number
    limit?: number
  }
  fields?: string[]
  locale?: string
  publicationState?: 'live' | 'preview'
  status?: 'draft' | 'published'
  next?: { revalidate?: number }
}

/**
 * Configuration du client Strapi
 */
export interface StrapiConfig {
  apiUrl: string
  apiToken?: string
}

/**
 * Classe utilitaire pour les requêtes Strapi typées
 */
export class StrapiClient {
  private config: StrapiConfig

  constructor(config: StrapiConfig) {
    // Valider l'URL
    if (!config.apiUrl || config.apiUrl === 'URLduFuturSite') {
      throw new Error(
        'STRAPI_URL invalide ou manquante. Configurez NEXT_PUBLIC_STRAPI_URL dans .env.local'
      )
    }

    this.config = config
  }

  /**
   * Construit les headers de la requête
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (this.config.apiToken) {
      headers['Authorization'] = `Bearer ${this.config.apiToken}`
    }

    return headers
  }

  /**
   * Construit l'URL avec les paramètres de requête
   */
  private buildUrl(path: string, options?: StrapiQueryOptions): string {
    const url = new URL(path, this.config.apiUrl)

    if (!options) return url.toString()

    // Preserve existing query params from the path
    const params = new URLSearchParams(url.search)

    // Helper: append populate keys in bracket format (Strapi v4/v5 friendly)
    const appendPopulateKey = (key: string) => {
      if (!key) return
      if (key === '*') {
        params.set('populate', '*')
        return
      }
      const parts = key
        .split('.')
        .map((p) => p.trim())
        .filter(Boolean)
      if (parts.length === 0) return
      const bracketed =
        parts.length === 1
          ? `populate[${parts[0]}]`
          : `populate[${parts.join('][')}]`
      params.append(bracketed, '*')
    }

    // Helper: flatten populate object into query params
    const flattenPopulate = (
      obj: Record<string, unknown>,
      prefix = 'populate'
    ) => {
      Object.entries(obj).forEach(([key, value]) => {
        const fullKey = `${prefix}[${key}]`
        if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value)
        ) {
          flattenPopulate(value as Record<string, unknown>, fullKey)
        } else {
          params.set(fullKey, String(value))
        }
      })
    }

    // Helper: flatten filters object into query params
    const flattenFilters = (
      obj: Record<string, unknown>,
      prefix = 'filters'
    ) => {
      Object.entries(obj).forEach(([key, value]) => {
        const fullKey = `${prefix}[${key}]`
        if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value)
        ) {
          flattenFilters(value as Record<string, unknown>, fullKey)
        } else {
          params.set(fullKey, String(value))
        }
      })
    }

    // Populate
    if (options.populate) {
      if (typeof options.populate === 'string') {
        const p = options.populate.trim()
        if (p === '*' || p === '' || p === 'deep') {
          // Support for populate=* and populate=deep (Strapi deep populate)
          params.set('populate', p)
        } else if (p.includes(',')) {
          // Pour les chemins multiples séparés par virgules, on utilise le format tableau indexé
          // requis par Strapi v5 : populate[0]=path1&populate[1]=path2...
          p.split(',')
            .map((k) => k.trim())
            .filter(Boolean)
            .forEach((key, idx) => {
              params.set(`populate[${idx}]`, key)
            })
        } else {
          appendPopulateKey(p)
        }
      } else if (Array.isArray(options.populate)) {
        options.populate.forEach((p) => appendPopulateKey(String(p)))
      } else {
        flattenPopulate(options.populate)
      }
    }

    // Filters (flattened serialization)
    if (options.filters) {
      flattenFilters(options.filters)
    }

    // Sort
    if (options.sort) {
      const sortArray = Array.isArray(options.sort)
        ? options.sort
        : [options.sort]
      sortArray.forEach((s) => params.append('sort', s))
    }

    // Pagination
    if (options.pagination) {
      Object.entries(options.pagination).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(`pagination[${key}]`, String(value))
        }
      })
    }

    // Fields
    if (options.fields) {
      options.fields.forEach((f) => params.append('fields', f))
    }

    // Locale
    if (options.locale) {
      params.set('locale', options.locale)
    }

    // Publication state (Strapi v5: use 'status' parameter instead of 'publicationState')
    if (options.status) {
      params.set('status', options.status)
    } else if (options.publicationState) {
      // Auto-convert publicationState to status for Strapi v5 compatibility
      const status =
        options.publicationState === 'preview' ? 'draft' : 'published'
      params.set('status', status)
    }

    url.search = params.toString()

    return url.toString()
  }

  /**
   * Récupère une collection
   */
  async findMany<T>(
    contentType: string,
    options?: StrapiQueryOptions
  ): Promise<StrapiCollectionResponse<T>> {
    try {
      const url = this.buildUrl(`/api/${contentType}`, options)

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        next:
          options?.publicationState === 'preview'
            ? undefined
            : (options?.next ?? { revalidate: 3600 }),
      })

      if (!response.ok) {
        const error: StrapiErrorResponse = await response.json()
        throw new Error(error.error.message)
      }

      return response.json()
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? (error as Error).message
          : String(error)
      console.warn(
        `Erreur lors de la récupération de ${contentType}: ${message}`
      )
      // Retourner une réponse vide pour éviter les erreurs de build
      return {
        data: [],
        meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } },
      } as StrapiCollectionResponse<T>
    }
  }

  /**
   * Récupère une entrée par ID
   */
  async findOne<T>(
    contentType: string,
    id: number | string,
    options?: StrapiQueryOptions
  ): Promise<StrapiResponse<T>> {
    try {
      const url = this.buildUrl(`/api/${contentType}/${id}`, options)

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        next:
          options?.publicationState === 'preview'
            ? undefined
            : (options?.next ?? { revalidate: 3600 }),
      })

      if (!response.ok) {
        const error: StrapiErrorResponse = await response.json()
        throw new Error(error.error.message)
      }

      return response.json()
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? (error as Error).message
          : String(error)
      console.warn(
        `Erreur lors de la récupération de ${contentType}/${id}: ${message}`
      )
      // Retourner null pour éviter les erreurs de build
      return { data: null, meta: {} } as StrapiResponse<T>
    }
  }

  /**
   * Crée une nouvelle entrée
   */
  async create<T>(
    contentType: string,
    data: Partial<T>
  ): Promise<StrapiResponse<T>> {
    const url = this.buildUrl(`/api/${contentType}`)

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ data }),
    })

    if (!response.ok) {
      const error: StrapiErrorResponse = await response.json()
      throw new Error(error.error.message)
    }

    return response.json()
  }

  /**
   * Met à jour une entrée
   */
  async update<T>(
    contentType: string,
    id: number | string,
    data: Partial<T>
  ): Promise<StrapiResponse<T>> {
    const url = this.buildUrl(`/api/${contentType}/${id}`)

    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ data }),
    })

    if (!response.ok) {
      const error: StrapiErrorResponse = await response.json()
      throw new Error(error.error.message)
    }

    return response.json()
  }

  /**
   * Supprime une entrée
   */
  async delete<T>(
    contentType: string,
    id: number | string
  ): Promise<StrapiResponse<T>> {
    const url = this.buildUrl(`/api/${contentType}/${id}`)

    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      const error: StrapiErrorResponse = await response.json()
      throw new Error(error.error.message)
    }

    return response.json()
  }
}

/**
 * Helper pour créer une instance du client Strapi
 */
export function createStrapiClient(config: StrapiConfig): StrapiClient {
  return new StrapiClient(config)
}
