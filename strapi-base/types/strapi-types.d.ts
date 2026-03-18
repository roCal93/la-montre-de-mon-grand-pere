/**
 * Types TypeScript générés depuis les schémas Strapi
 * 
 * ⚠️  FICHIER AUTO-GÉNÉRÉ - NE PAS MODIFIER
 * 
 * Pour régénérer: npm run generate:types
 * Généré le: 2026-02-20T06:22:00.559Z
 */

// ============================================================================
// TYPES DE BASE STRAPI
// ============================================================================

export type StrapiID = number;
export type StrapiDateTime = string;
export type StrapiFileUrl = string;
export type StrapiJSON = Record<string, unknown>;

export interface StrapiMedia {
  id: StrapiID;
  url: StrapiFileUrl;
  mime?: string;
  alternativeText?: string | null;
  caption?: string | null;
  width?: number;
  height?: number;
  formats?: {
    thumbnail?: StrapiMediaFormat;
    small?: StrapiMediaFormat;
    medium?: StrapiMediaFormat;
    large?: StrapiMediaFormat;
  };
  [key: string]: unknown;
}

export interface StrapiMediaFormat {
  url: StrapiFileUrl;
  width: number;
  height: number;
  mime: string;
  [key: string]: unknown;
}

export interface StrapiBlock {
  type: string;
  children?: Array<{
    type: string;
    text?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

// ============================================================================
// TYPES D'ENVELOPPE STRAPI V5
// ============================================================================

// Strapi v5 : les données sont retournées directement (plus d'attributes)
export interface StrapiEntity {
  id: StrapiID;
  documentId: string;
}

export interface StrapiResponse<T> {
  data: (T & StrapiEntity) | null;
  meta: Record<string, unknown>;
}

export interface StrapiCollectionResponse<T> {
  data: Array<T & StrapiEntity>;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiErrorResponse {
  error: {
    status: number;
    name: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Component: blocks.carousel-block
 */
export interface CarouselBlock {
  workItems?: (WorkItem & StrapiEntity)[];
  scrollSpeed?: number;
}

/**
 * Component: shared.button
 */
export interface Button {
  label: string;
  url?: string;
  file?: StrapiMedia;
  variant: string;
  isExternal?: boolean;
  icon?: string;
}

/**
 * Component: shared.carousel-card
 */
export interface CarouselCard {
  frontTitle: string;
  frontContent?: StrapiBlock[];
  backContent?: StrapiBlock[];
  image?: StrapiMedia;
}

/**
 * Component: shared.external-link
 */
export interface ExternalLink {
  url: string;
  label?: string;
}

/**
 * Component: shared.page-link
 */
export interface PageLink {
  page?: (Page & StrapiEntity);
  customLabel?: string;
  section?: (Section & StrapiEntity);
}

/**
 * Component: shared.timeline-image
 */
export interface TimelineImage {
  image: StrapiMedia;
  link?: ExternalLink;
}

/**
 * Component: shared.timeline-item
 */
export interface TimelineItem {
  title: string;
  date?: string;
  description?: string;
  images?: TimelineImage[];
}

// ============================================================================
// CONTENT TYPES
// ============================================================================

/**
 * card
 */
export interface Card {
  title?: string;
  subtitle?: string;
  content?: StrapiBlock[];
  image?: StrapiMedia;
  locale?: string;
  localizations?: (Card & StrapiEntity)[];
}
export type CardResponse = StrapiResponse<Card>;
export type CardCollectionResponse = StrapiCollectionResponse<Card>;

/**
 * Header
 */
export interface Header {
  variant?: string;
  logo?: StrapiMedia;
  title?: string;
  navigation?: PageLink[];
  hideLanguageSwitcher?: boolean;
  locale?: string;
  localizations?: (Header & StrapiEntity)[];
}
export type HeaderResponse = StrapiResponse<Header>;
export type HeaderCollectionResponse = StrapiCollectionResponse<Header>;

/**
 * page
 */
export interface Page {
  title?: string;
  hideTitle?: boolean;
  slug: string;
  sections?: (Section & StrapiEntity)[];
  seoTitle?: string;
  seoDescription?: StrapiBlock[];
  seoImage?: StrapiMedia;
  noIndex?: boolean;
  locale?: string;
  localizations?: (Page & StrapiEntity)[];
}
export type PageResponse = StrapiResponse<Page>;
export type PageCollectionResponse = StrapiCollectionResponse<Page>;

/**
 * Privacy Policy
 */
export interface PrivacyPolicy {
  title: string;
  content: string;
  closeButtonText?: string;
  lastUpdated?: string;
  locale?: string;
  localizations?: (PrivacyPolicy & StrapiEntity)[];
}
export type PrivacyPolicyResponse = StrapiResponse<PrivacyPolicy>;
export type PrivacyPolicyCollectionResponse = StrapiCollectionResponse<PrivacyPolicy>;

/**
 * section
 */
export interface Section {
  title?: string;
  identifier: string;
  hideTitle?: boolean;
  blocks: unknown[];
  order: number;
  spacingTop?: string;
  spacingBottom?: string;
  containerWidth?: string;
  locale?: string;
  localizations?: (Section & StrapiEntity)[];
}
export type SectionResponse = StrapiResponse<Section>;
export type SectionCollectionResponse = StrapiCollectionResponse<Section>;

/**
 * Work Category
 */
export interface WorkCategory {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: StrapiMedia;
  work_items?: (WorkItem & StrapiEntity)[];
  locale?: string;
  localizations?: (WorkCategory & StrapiEntity)[];
}
export type WorkCategoryResponse = StrapiResponse<WorkCategory>;
export type WorkCategoryCollectionResponse = StrapiCollectionResponse<WorkCategory>;

/**
 * Work Item
 */
export interface WorkItem {
  title: string;
  slug: string;
  description?: StrapiBlock[];
  shortDescription?: string;
  image: StrapiMedia;
  gallery?: StrapiMedia[];
  categories?: (WorkCategory & StrapiEntity)[];
  link?: string;
  client?: string;
  year?: number;
  technologies?: Record<string, unknown>;
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  featured?: boolean;
  order?: number;
  locale?: string;
  localizations?: (WorkItem & StrapiEntity)[];
}
export type WorkItemResponse = StrapiResponse<WorkItem>;
export type WorkItemCollectionResponse = StrapiCollectionResponse<WorkItem>;
