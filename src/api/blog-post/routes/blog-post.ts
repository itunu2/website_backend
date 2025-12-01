import { factories } from '@strapi/strapi';

const BLOG_POST_UID = 'api::blog-post.blog-post' as const;

export default factories.createCoreRouter(BLOG_POST_UID as never, {
  config: {
    find: { auth: false },
    findOne: { auth: false },
    count: { auth: false },
  },
});
