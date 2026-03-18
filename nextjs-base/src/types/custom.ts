/**
 * Types personnalisés pour l'application
 *
 * Ce fichier contient les types qui étendent ou complètent les types auto-générés de Strapi
 */

/**
 * Union type pour tous les blocs dynamiques Strapi
 * Chaque bloc a une propriété __component qui permet de le discriminer
 */
export type DynamicBlock =
  | ({ __component: 'blocks.button-block' } & Record<string, unknown>)
  | ({ __component: 'blocks.cards-block' } & Record<string, unknown>)
  | ({ __component: 'blocks.image-block' } & Record<string, unknown>)
  | ({ __component: 'blocks.text-block' } & Record<string, unknown>)
  | ({ __component: 'blocks.text-image-block' } & Record<string, unknown>)
