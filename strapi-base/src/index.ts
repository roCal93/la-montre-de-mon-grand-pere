import type { Core } from '@strapi/strapi';
import stripeSync from './extensions/stripeSync';

const WATCH_FILE_LAYOUT_KEY =
  'plugin_content_manager_configuration_content_types::api::watch-file.watch-file';

type ContentManagerLayoutItem = {
  name?: string;
  size?: number;
};

type ContentManagerConfiguration = {
  layouts?: {
    edit?: ContentManagerLayoutItem[][];
  };
};

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

async function ensureWatchFileEditLayoutOrder(strapi: Core.Strapi) {
  try {
    const db = strapi.db.connection;
    const entry = await db('strapi_core_store_settings')
      .select('id', 'key', 'value')
      .where({ key: WATCH_FILE_LAYOUT_KEY })
      .first();

    if (!entry?.value) {
      return;
    }

    const configuration = JSON.parse(entry.value) as ContentManagerConfiguration;
    const editLayout = configuration.layouts?.edit;

    if (!editLayout?.length) {
      return;
    }

    const validationIndex = editLayout.findIndex(
      (row) => row[0]?.name === 'validationAtelier'
    );
    const dossierBlocksIndex = editLayout.findIndex((row) => row[0]?.name === 'dossierBlocks');

    if (
      validationIndex === -1 ||
      dossierBlocksIndex === -1 ||
      dossierBlocksIndex < validationIndex
    ) {
      return;
    }

    const nextEditLayout = [...editLayout];
    const [dossierBlocksRow] = nextEditLayout.splice(dossierBlocksIndex, 1);
    nextEditLayout.splice(validationIndex, 0, dossierBlocksRow);

    configuration.layouts = {
      ...configuration.layouts,
      edit: nextEditLayout,
    };

    await db('strapi_core_store_settings')
      .where({ key: WATCH_FILE_LAYOUT_KEY })
      .update({ value: JSON.stringify(configuration) });

    strapi.log.info(
      '[bootstrap] Normalized watch-file edit layout: dossierBlocks before validationAtelier'
    );
  } catch (error) {
    strapi.log.error('[bootstrap] Failed to normalize watch-file edit layout:', error);
  }
}

async function normalizeWatchFileLocale(strapi: Core.Strapi) {
  try {
    const db = strapi.db.connection;
    const updated = await db('watch_files')
      .whereNotNull('locale')
      .update({ locale: null });

    if (updated) {
      strapi.log.warn(
        `[bootstrap] Normalized watch-file locale to null on ${updated} row(s)`
      );
    }
  } catch (error) {
    strapi.log.error('[bootstrap] Failed to normalize watch-file locale:', error);
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
    await ensureWatchFileEditLayoutOrder(strapi);
    await normalizeWatchFileLocale(strapi);
  },
};
