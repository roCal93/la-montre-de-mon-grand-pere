/**
 * Types TypeScript Strapi pour Next.js
 * 
 * ⚠️  FICHIER AUTO-GÉNÉRÉ - NE PAS MODIFIER
 * 
 * Ce fichier est synchronisé depuis strapi-base/types/strapi-types.d.ts
 * Pour mettre à jour:
 *   1. Depuis strapi-base: npm run generate:types
 *   2. Depuis strapi-base: npm run sync:types
 *   
 * Ou depuis nextjs-base: npm run sync:types
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

export interface StrapiUser {
    username?: string;
    email?: string;
    firstname?: string;
    lastname?: string;
    blocked?: boolean;
    confirmed?: boolean;
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
 * Component: blocks.background-block
 */
export interface BackgroundBlock {
  type: string;
  color?: string;
  gradient?: string;
  image?: StrapiMedia;
  imageDesktop?: StrapiMedia;
  positionMobile?: string;
  positionDesktop?: string;
  sizeMobile?: string;
  sizeDesktop?: string;
  repeat?: string;
  fixed?: boolean;
  overlayColor?: string;
  overlayOpacity?: number;
  scope?: string;
}

/**
 * Component: blocks.blank-block
 */
export interface BlankBlock {
  size: string;
}

/**
 * Component: blocks.button-block
 */
export interface ButtonBlock {
  buttons: Button[];
  alignment: string;
  layout?: string;
  equalWidth?: boolean;
}

/**
 * Component: blocks.cards-block
 */
export interface CardsBlock {
  cards: (Card & StrapiEntity)[];
  columns: string;
  alignment: string;
  overlap?: boolean;
}

/**
 * Component: blocks.contact-form-block
 */
export interface ContactFormBlock {
  title?: string;
  description?: string;
  submitButtonText?: string;
  namePlaceholder?: string;
  emailPlaceholder?: string;
  messagePlaceholder?: string;
  nameLabel?: string;
  emailLabel?: string;
  messageLabel?: string;
  consentText?: string;
  policyLinkText?: string;
  successMessage?: string;
  errorMessage?: string;
  submittingText?: string;
  rgpdInfoText?: string;
  consentRequiredText?: string;
  privacyPolicy?: (PrivacyPolicy & StrapiEntity);
  blockAlignment: string;
  maxWidth: string;
}

/**
 * Component: blocks.hero-block-simple-text
 */
export interface HeroBlockSimpleText {
  title?: string;
  content: string;
  height: string;
  textAlignment: string;
}

/**
 * Component: blocks.image-block
 */
export interface ImageBlock {
  image: StrapiMedia;
  caption?: string;
  alignment: string;
  size: string;
}

/**
 * Component: blocks.product-list-block
 */
export interface ProductListBlock {
  title?: string;
  subtitle?: string;
  category?: (ProductCategory & StrapiEntity);
  maxItems?: number;
  showFilters?: boolean;
}

/**
 * Component: blocks.text-block
 */
export interface TextBlock {
  content: StrapiBlock[];
  textAlignment: string;
  blockAlignment: string;
  maxWidth: string;
}

/**
 * Component: blocks.text-image-block
 */
export interface TextImageBlock {
  content: StrapiBlock[];
  images?: StrapiMedia[];
  imagePosition: string;
  imageSize: string;
  verticalAlignment: string;
  textAlignment: string;
  roundedImage?: boolean;
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

/**
 * Component: shop.order-line-item
 */
export interface OrderLineItem {
  productId: string;
  productName: string;
  productSlug?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/**
 * Component: shop.shipping-address
 */
export interface ShippingAddress {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
}

/**
 * Component: watch-file.audio-block
 */
export interface AudioBlock {
  title?: string;
  content?: StrapiBlock[];
  audio: StrapiMedia;
}

/**
 * Component: watch-file.before-after-block
 */
export interface BeforeAfterBlock {
  title?: string;
  content?: StrapiBlock[];
  beforeImage: StrapiMedia;
  afterImage: StrapiMedia;
}

/**
 * Component: watch-file.controle-qualite-mesures
 */
export interface ControleQualiteMesures {
  marcheMoyennePublique?: string;
  etancheitePublique?: string;
  reglageEtPrecision?: LigneReglagePosition[];
  testEtancheite?: LigneTestEtancheite[];
  observationsConclusions?: string;
}

/**
 * Component: watch-file.etat-general-global
 */
export interface EtatGeneralGlobal {
  boitier?: IndicateurEtatGeneral;
  cadran?: IndicateurEtatGeneral;
  mouvement?: IndicateurEtatGeneral;
  bracelet?: IndicateurEtatGeneral;
}

/**
 * Component: watch-file.etat-general
 */
export interface EtatGeneral {
  etatGeneralGlobal?: EtatGeneralGlobal;
  fonctionnementAvantIntervention?: LigneObservationConstat[];
  etatVisuelComposants?: LigneComposantObservation[];
}

/**
 * Component: watch-file.image-block
 */
export interface ImageBlock {
  title?: string;
  image: StrapiMedia;
}

/**
 * Component: watch-file.indicateur-etat-general
 */
export interface IndicateurEtatGeneral {
  pourcentage?: number;
  commentaire?: string;
}

/**
 * Component: watch-file.ligne-composant-observation
 */
export interface LigneComposantObservation {
  composant: string;
  observations?: string;
}

/**
 * Component: watch-file.ligne-observation-constat
 */
export interface LigneObservationConstat {
  observation: string;
  constat?: string;
}

/**
 * Component: watch-file.ligne-operation-reparation
 */
export interface LigneOperationReparation {
  operation: string;
  realisee?: boolean;
  observations?: string;
}

/**
 * Component: watch-file.ligne-reglage-position
 */
export interface LigneReglagePosition {
  position: string;
  rate?: string;
  amplitude?: string;
  beatError?: string;
  frequence?: string;
  resultat?: string;
}

/**
 * Component: watch-file.ligne-test-etancheite
 */
export interface LigneTestEtancheite {
  test: string;
  valeurResultat?: string;
  observations?: string;
}

/**
 * Component: watch-file.operations-reparation
 */
export interface OperationsReparation {
  operationsPubliques?: string;
  operationsEffectuees?: LigneOperationReparation[];
  piecesRemplacees?: PieceRemplacee[];
}

/**
 * Component: watch-file.piece-remplacee
 */
export interface PieceRemplacee {
  designationPiece?: string;
  referenceCalibre?: string;
  quantite?: number;
  origine?: string;
  etatPiece?: string;
}

/**
 * Component: watch-file.public-badge
 */
export interface PublicBadge {
  label: string;
}

/**
 * Component: watch-file.rich-text-block
 */
export interface RichTextBlock {
  title?: string;
  content: StrapiBlock[];
}

/**
 * Component: watch-file.text-image-block
 */
export interface TextImageBlock {
  title?: string;
  content: StrapiBlock[];
  images?: StrapiMedia[];
  imagePosition: string;
}

/**
 * Component: watch-file.validation-atelier
 */
export interface ValidationAtelier {
  dateFin?: string;
  dureeIntervention?: string;
  signature?: StrapiMedia;
  dateSignature?: string;
}

/**
 * Component: watch-file.video-block
 */
export interface VideoBlock {
  title?: string;
  content?: StrapiBlock[];
  video: StrapiMedia;
}

// ============================================================================
// CONTENT TYPES
// ============================================================================

/**
 * Blog Article
 */
export interface BlogArticle {
  title: string;
  slug: string;
  excerpt?: string;
  coverImage?: StrapiMedia;
  publicationDate?: string;
  authorName?: string;
  featured?: boolean;
  categories?: (BlogCategory & StrapiEntity)[];
  sections?: (Section & StrapiEntity)[];
  seoTitle?: string;
  seoDescription?: StrapiBlock[];
  seoImage?: StrapiMedia;
  noIndex?: boolean;
  locale?: string;
  localizations?: (BlogArticle & StrapiEntity)[];
}
export type BlogArticleResponse = StrapiResponse<BlogArticle>;
export type BlogArticleCollectionResponse = StrapiCollectionResponse<BlogArticle>;

/**
 * Blog Category
 */
export interface BlogCategory {
  name: string;
  slug: string;
  description?: string;
  articles?: (BlogArticle & StrapiEntity)[];
  locale?: string;
  localizations?: (BlogCategory & StrapiEntity)[];
}
export type BlogCategoryResponse = StrapiResponse<BlogCategory>;
export type BlogCategoryCollectionResponse = StrapiCollectionResponse<BlogCategory>;

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
 * Garantie
 */
export interface Garantie {
  title: string;
  content: string;
  lastUpdated?: string;
  locale?: string;
  localizations?: (Garantie & StrapiEntity)[];
}
export type GarantieResponse = StrapiResponse<Garantie>;
export type GarantieCollectionResponse = StrapiCollectionResponse<Garantie>;

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
 * Legal Notice
 */
export interface LegalNotice {
  title: string;
  content: string;
  closeButtonText?: string;
  lastUpdated?: string;
  locale?: string;
  localizations?: (LegalNotice & StrapiEntity)[];
}
export type LegalNoticeResponse = StrapiResponse<LegalNotice>;
export type LegalNoticeCollectionResponse = StrapiCollectionResponse<LegalNotice>;

/**
 * Livraison
 */
export interface Livraison {
  title: string;
  content: string;
  lastUpdated?: string;
  locale?: string;
  localizations?: (Livraison & StrapiEntity)[];
}
export type LivraisonResponse = StrapiResponse<Livraison>;
export type LivraisonCollectionResponse = StrapiCollectionResponse<Livraison>;

/**
 * Order
 */
export interface Order {
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  status: string;
  customerEmail: string;
  customerName: string;
  lineItems: OrderLineItem[];
  shippingAddress: ShippingAddress;
  subtotal: number;
  shippingCost?: number;
  total: number;
  currency: string;
  notes?: string;
  customer?: (StrapiUser & StrapiEntity);
}
export type OrderResponse = StrapiResponse<Order>;
export type OrderCollectionResponse = StrapiCollectionResponse<Order>;

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
 * Product
 */
export interface Product {
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  images?: StrapiMedia[];
  active: boolean;
  category?: (ProductCategory & StrapiEntity);
  watchFile?: (WatchFile & StrapiEntity);
  stripePriceId?: string;
  locale?: string;
  localizations?: (Product & StrapiEntity)[];
}
export type ProductResponse = StrapiResponse<Product>;
export type ProductCollectionResponse = StrapiCollectionResponse<Product>;

/**
 * Product Category
 */
export interface ProductCategory {
  name: string;
  slug: string;
  description?: string;
  image?: StrapiMedia;
  products?: (Product & StrapiEntity)[];
  locale?: string;
  localizations?: (ProductCategory & StrapiEntity)[];
}
export type ProductCategoryResponse = StrapiResponse<ProductCategory>;
export type ProductCategoryCollectionResponse = StrapiCollectionResponse<ProductCategory>;

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
 * Demande de service
 */
export interface ServiceRequest {
  type: string;
  watch_description?: string;
  description: string;
  photos?: StrapiMedia[];
  status: string;
  admin_response?: string;
  customer?: (StrapiUser & StrapiEntity);
  watch_file?: (WatchFile & StrapiEntity);
}
export type ServiceRequestResponse = StrapiResponse<ServiceRequest>;
export type ServiceRequestCollectionResponse = StrapiCollectionResponse<ServiceRequest>;

/**
 * Dossier Montre
 */
export interface WatchFile {
  reference: string;
  dateReception?: string;
  dateMiseEnVente?: string;
  marque?: string;
  referencePiece?: string;
  modele?: string;
  complications?: string;
  mouvement?: string;
  calibre?: string;
  anneeEstimee?: string;
  matiereBoitier?: string;
  diametreBoitier?: string;
  epaisseur?: string;
  matiereBracelet?: string;
  boucle?: string;
  verre?: string;
  etancheiteAnnoncee?: string;
  marketingShortDescription?: string;
  marketingDescription?: string;
  publicBadges?: PublicBadge[];
  etatGeneral?: EtatGeneral;
  operationsReparation?: OperationsReparation;
  controleQualiteMesures?: ControleQualiteMesures;
  notesIdentification?: string;
  dossierBlocks?: unknown[];
  validationAtelier?: ValidationAtelier;
  publicBeforeImage?: StrapiMedia[];
  publicAfterImage?: StrapiMedia[];
  customer?: (StrapiUser & StrapiEntity);
  order?: (Order & StrapiEntity);
  product: (Product & StrapiEntity);
}
export type WatchFileResponse = StrapiResponse<WatchFile>;
export type WatchFileCollectionResponse = StrapiCollectionResponse<WatchFile>;

/**
 * Webhook Error
 */
export interface WebhookError {
  provider: string;
  eventId: string;
  eventType: string;
  message: string;
  stack?: string;
  occurredAt: string;
}
export type WebhookErrorResponse = StrapiResponse<WebhookError>;
export type WebhookErrorCollectionResponse = StrapiCollectionResponse<WebhookError>;

/**
 * Favori
 */
export interface WishlistItem {
  customer: (StrapiUser & StrapiEntity);
  product: (Product & StrapiEntity);
}
export type WishlistItemResponse = StrapiResponse<WishlistItem>;
export type WishlistItemCollectionResponse = StrapiCollectionResponse<WishlistItem>;

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
