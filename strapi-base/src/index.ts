import type { Core } from '@strapi/strapi';
import stripeSync from './extensions/stripeSync';

async function cleanupBrokenBlogCategoryLinks(strapi: Core.Strapi) {
  try {
    const db = strapi.db.connection;
    const table = 'blog_articles_categories_lnk';

    // Remove null foreign keys that break relation ordering updates at publish.
    const deletedNull = await db(table)
      .whereNull('blog_article_id')
      .orWhereNull('blog_category_id')
      .del();

    // Remove orphan links referencing missing rows.
    const deletedOrphans = await db(table)
      .whereNotExists(
        db('blog_articles')
          .select(1)
          .whereRaw('blog_articles.id = blog_articles_categories_lnk.blog_article_id')
      )
      .orWhereNotExists(
        db('blog_categories')
          .select(1)
          .whereRaw('blog_categories.id = blog_articles_categories_lnk.blog_category_id')
      )
      .del();

    if (deletedNull || deletedOrphans) {
      strapi.log.warn(
        `[bootstrap] Cleaned broken blog category links: null=${deletedNull}, orphans=${deletedOrphans}`
      );
    }
  } catch (error) {
    // Non-blocking: startup should continue even if cleanup cannot run.
    strapi.log.error('[bootstrap] Failed to cleanup blog relation links:', error);
  }
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    // Register Stripe sync webhook
    stripeSync(strapi);
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await cleanupBrokenBlogCategoryLinks(strapi);
  },
};
