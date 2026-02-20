import { factories } from '@strapi/strapi';
import { cache } from '../../../utils/cache';
import { env } from '../../../utils/env';
import { blogPostCacheKeys } from '../utils/cache-helpers';

type BlogPostEntity = {
  slug?: string | null;
  status?: string | null;
  tags?: unknown;
};

type BlogPost = BlogPostEntity & Record<string, unknown>;

const normalizeTags = (tags: BlogPostEntity['tags']) => {
  if (!Array.isArray(tags)) {
    return [] as string[];
  }

  return tags.filter((value): value is string => typeof value === 'string');
};

export default factories.createCoreService('api::blog-post.blog-post', ({ strapi }) => ({
  async findPublished(slug: string) {
    if (!slug) {
      throw new Error('A slug is required to fetch a published blog post');
    }

    const cacheKey = blogPostCacheKeys.slug(slug);

    if (cache.isEnabled()) {
      const cached = await cache.get<BlogPost>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const posts = await strapi.db.query('api::blog-post.blog-post').findMany({
      where: {
        slug: { $eq: slug },
        status: { $eq: 'published' },
      },
      limit: 1,
      populate: { featuredImage: true },
    });

    const post = Array.isArray(posts) && posts.length > 0 ? posts[0] : null;

    if (post && cache.isEnabled()) {
      await cache.set(cacheKey, post, env.cacheTtlSeconds);
    }

    return post;
  },

  async findByTag(tag: string) {
    if (!tag) {
      throw new Error('A tag is required to filter blog posts');
    }

    const cacheKey = blogPostCacheKeys.tag(tag);

    if (cache.isEnabled()) {
      const cached = await cache.get<BlogPost[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const posts = await strapi.db.query('api::blog-post.blog-post').findMany({
      where: { status: { $eq: 'published' } },
      populate: { featuredImage: true },
      orderBy: { publishedDate: 'desc' },
    });

    const filtered = posts.filter((post: BlogPostEntity) =>
      normalizeTags(post.tags).some((value) => value.toLowerCase() === tag.toLowerCase()),
    );

    if (cache.isEnabled()) {
      await cache.set(cacheKey, filtered, env.cacheTtlSeconds);
    }

    return filtered;
  },
}));
