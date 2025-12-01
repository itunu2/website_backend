import { factories } from '@strapi/strapi';

type BlogPostEntity = {
  slug?: string | null;
  status?: string | null;
  tags?: unknown;
};

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

    const [post] = await strapi.entityService.findMany('api::blog-post.blog-post', {
      filters: { slug, status: 'published' },
      limit: 1,
      populate: ['featuredImage'],
      publicationState: 'live',
    });

    return post ?? null;
  },

  async findByTag(tag: string) {
    if (!tag) {
      throw new Error('A tag is required to filter blog posts');
    }

    const posts = await strapi.entityService.findMany('api::blog-post.blog-post', {
      filters: { status: 'published' },
      populate: ['featuredImage'],
      publicationState: 'live',
      sort: { publishedDate: 'desc' },
    });

    return posts.filter((post: BlogPostEntity) =>
      normalizeTags(post.tags).some((value) => value.toLowerCase() === tag.toLowerCase()),
    );
  },
}));
