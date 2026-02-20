import type { Core } from '@strapi/strapi';

const BLOG_POST_UID = 'api::blog-post.blog-post' as const;

const toCount = (result: unknown): number => {
  if (typeof result === 'number') {
    return result;
  }

  if (result && typeof result === 'object' && 'count' in result) {
    const value = (result as { count?: unknown }).count;
    if (typeof value === 'number') {
      return value;
    }
  }

  return 0;
};

export const syncBlogPostStatuses = async (strapi: Core.Strapi) => {
  try {
    const publishedUpdatesResult = await strapi.db
      .query(BLOG_POST_UID)
      .updateMany({
        where: {
          publishedAt: { $notNull: true },
          status: { $ne: 'published' },
        },
        data: { status: 'published' },
      });

    const draftUpdatesResult = await strapi.db
      .query(BLOG_POST_UID)
      .updateMany({
        where: {
          publishedAt: null,
          status: { $ne: 'draft' },
        },
        data: { status: 'draft' },
      });

    const publishedUpdates = toCount(publishedUpdatesResult);
    const draftUpdates = toCount(draftUpdatesResult);

    if (publishedUpdates > 0 || draftUpdates > 0) {
      strapi.log.info('Synced blog post publication statuses', {
        publishedUpdates,
        draftUpdates,
      });
    }
  } catch (error) {
    strapi.log.error('Failed to sync blog post publication statuses', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};