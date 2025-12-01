import { cache } from '../../../utils/cache';

export type BlogPostLike = {
  slug?: string | null;
  tags?: unknown;
};

const formatTag = (tag: string) => tag.trim().toLowerCase();

export const blogPostCacheKeys = {
  slug: (slug: string) => `blog:slug:${slug}`,
  tag: (tag: string) => `blog:tag:${formatTag(tag)}`,
};

export const invalidateBlogPostCache = async (entry?: BlogPostLike | null) => {
  if (!entry || !cache.isEnabled()) {
    return;
  }

  const operations: Array<Promise<void>> = [];

  if (entry.slug) {
    operations.push(cache.delete(blogPostCacheKeys.slug(entry.slug)));
  }

  if (Array.isArray(entry.tags)) {
    for (const tag of entry.tags) {
      if (typeof tag === 'string') {
        operations.push(cache.delete(blogPostCacheKeys.tag(tag)));
      }
    }
  }

  await Promise.all(operations);
};
