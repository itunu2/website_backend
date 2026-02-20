import { factories } from '@strapi/strapi';

const BLOG_POST_UID = 'api::blog-post.blog-post' as const;

export default factories.createCoreController(BLOG_POST_UID as never, ({ strapi }) => ({
  async find(ctx) {
    const { filters: incomingFilters = {}, ...rest } = ctx.query ?? {};
    const safeFilters =
      typeof incomingFilters === 'object' && incomingFilters !== null ? incomingFilters : {};

    ctx.query = {
      ...rest,
      filters: {
        ...safeFilters,
        status: 'published',
      },
      sort: ctx.query?.sort ?? { publishedDate: 'desc' },
    };

    return super.find(ctx);
  },

  async findPublishedBySlug(ctx) {
    const { slug } = ctx.params;

    if (!slug) {
      return ctx.badRequest('A slug parameter is required');
    }

    try {
      const post = await strapi.service(BLOG_POST_UID).findPublished(slug);

      if (!post) {
        return ctx.notFound('Blog post not found');
      }

      const controller = this as unknown as {
        sanitizeOutput: (data: unknown, context: unknown) => Promise<unknown>;
        transformResponse: (data: unknown) => unknown;
      };

      const sanitizedEntity = await controller.sanitizeOutput(post, ctx);
      return controller.transformResponse(sanitizedEntity);
    } catch (error) {
      strapi.log.error('Failed to fetch blog post by slug', { slug, error });
      throw error;
    }
  },

  async findByTag(ctx) {
    const { tag } = ctx.params;

    if (!tag) {
      return ctx.badRequest('A tag parameter is required');
    }

    try {
      const posts = await strapi.service(BLOG_POST_UID).findByTag(tag);
      const controller = this as unknown as {
        sanitizeOutput: (data: unknown, context: unknown) => Promise<unknown>;
        transformResponse: (data: unknown) => unknown;
      };

      const sanitizedEntities = await controller.sanitizeOutput(posts, ctx);
      return controller.transformResponse(sanitizedEntities);
    } catch (error) {
      strapi.log.error('Failed to fetch blog posts by tag', { tag, error });
      throw error;
    }
  },
}));
