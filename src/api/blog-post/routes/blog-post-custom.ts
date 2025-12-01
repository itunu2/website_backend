const slugRoute = {
  method: 'GET',
  path: '/blog-posts/slug/:slug',
  handler: 'blog-post.findPublishedBySlug',
  config: {
    auth: false,
  },
} as const;

const tagRoute = {
  method: 'GET',
  path: '/blog-posts/tag/:tag',
  handler: 'blog-post.findByTag',
  config: {
    auth: false,
  },
} as const;

export default {
  routes: [slugRoute, tagRoute],
};
