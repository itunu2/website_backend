import slugify from 'slugify';
import { invalidateBlogPostCache, type BlogPostLike } from '../../utils/cache-helpers';

type BlogPostData = BlogPostLike & {
  title?: string | null;
};

type BlogPostLifecycleEvent = {
  params?: {
    data?: BlogPostData | null;
  } | null;
  result?: BlogPostData | null;
};

const generateSlug = (title?: string | null) =>
  title ? slugify(title, { lower: true, strict: true, trim: true }) : undefined;

const ensureSlug = (data?: BlogPostData | null) => {
  if (!data) {
    return;
  }

  const title = typeof data.title === 'string' ? data.title : undefined;
  const slug = typeof data.slug === 'string' ? data.slug : undefined;

  if (!slug && title) {
    data.slug = generateSlug(title);
  }
};

const lifecycles = {
  async beforeCreate(event: BlogPostLifecycleEvent) {
    ensureSlug(event.params?.data);
  },
  async beforeUpdate(event: BlogPostLifecycleEvent) {
    ensureSlug(event.params?.data);
  },
  async afterCreate(event: BlogPostLifecycleEvent) {
    await invalidateBlogPostCache(event.result);
  },
  async afterUpdate(event: BlogPostLifecycleEvent) {
    await invalidateBlogPostCache(event.result);
  },
  async afterDelete(event: BlogPostLifecycleEvent) {
    await invalidateBlogPostCache(event.result ?? event.params?.data);
  },
};

export default lifecycles;
