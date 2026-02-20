import type { Core } from '@strapi/strapi';
import { createStrapi } from '@strapi/strapi';
import supertest from 'supertest';

jest.setTimeout(60000);

const TEST_PORT = 1450;
const BLOG_POST_UID = 'api::blog-post.blog-post' as const;

type ApiTokenService = {
  create: (attributes: Record<string, unknown>) => Promise<{ id: number; accessKey: string }>;
  revoke: (id: number) => Promise<void>;
};

type BlogPostAttributes = {
  slug: string;
  title?: string;
  status?: string;
  tags?: string[] | null;
  description?: string | null;
  content?: string | null;
  publishedDate?: string | null;
  isFeatured?: boolean;
  publishedAt?: string | null;
};

type BlogPostFlatEntity = BlogPostAttributes & { id: number; documentId?: string };

type BlogPostApiEntity = BlogPostFlatEntity | { id: number; documentId?: string; attributes: BlogPostAttributes };

const unwrapBlogPost = (entity: BlogPostApiEntity): BlogPostFlatEntity => {
  if ('attributes' in entity && entity.attributes) {
    return { id: entity.id, documentId: entity.documentId, ...entity.attributes };
  }

  return entity as BlogPostFlatEntity;
};

const parseJson = <T>(response: supertest.Response): T => {
  if (response.body && Object.keys(response.body).length > 0) {
    return response.body as T;
  }

  if (response.text) {
    return JSON.parse(response.text) as T;
  }

  throw new Error('Response body is empty');
};

describe('Blog Post Content API', () => {
  let strapi: Core.Strapi;
  let tokenId: number | null = null;
  let authHeader: Record<string, string> = {};
  let httpClient: ReturnType<typeof supertest>;

  beforeAll(async () => {
    process.env.PORT = String(TEST_PORT);

    strapi = await createStrapi({ distDir: 'dist' });

    const runtime = strapi as unknown as {
      stopWithError?: (err: unknown, message?: string) => never;
      stop?: () => never;
    };

    if (runtime.stopWithError) {
      runtime.stopWithError = (err?: unknown, message?: string) => {
        const details = err instanceof Error ? err : new Error(message ?? 'Strapi start failed');
        throw details;
      };
    }

    if (runtime.stop) {
      runtime.stop = () => {
        throw new Error('Strapi stop invoked unexpectedly');
      };
    }

    await strapi.start();

    const server = strapi.server.httpServer;
    if (!server) {
      throw new Error('Failed to initialize Strapi HTTP server for integration tests');
    }

    httpClient = supertest(server);

    const apiTokenService = strapi.admin.services['api-token'] as ApiTokenService;
    const token = await apiTokenService.create({
      name: `integration-${Date.now()}`,
      description: 'Automated integration test token',
      type: 'full-access',
    });

    tokenId = token.id;
    authHeader = { Authorization: `Bearer ${token.accessKey}` };
  });

  afterAll(async () => {
    if (tokenId) {
      const apiTokenService = strapi.admin.services['api-token'] as ApiTokenService;
      await apiTokenService.revoke(tokenId);
    }

    await strapi.destroy();
  });

  it('supports authenticated CRUD flows plus public reads', async () => {
    const slug = `integration-${Date.now()}`;
    const now = new Date().toISOString();
    const createPayload = {
      title: 'Integration Test Blog Post',
      slug,
      description: 'Created from automated integration test',
      content: '## Content Body',
      tags: ['Engineering', 'Automation'],
      status: 'draft',
      publishedDate: now,
      isFeatured: false,
    } as const;

    const createResponse = await httpClient
      .post('/api/blog-posts')
      .set(authHeader)
      .send({ data: createPayload });

    expect(createResponse.status).toBe(201);
    const createBody = parseJson<{ data: BlogPostApiEntity }>(createResponse);
    const createdPost = unwrapBlogPost(createBody.data);
    expect(createdPost.title).toBe(createPayload.title);

    const documentId = createBody.data.documentId;
    if (!documentId) {
      throw new Error('Create response missing documentId');
    }

    const updateResponse = await httpClient
      .put(`/api/blog-posts/${documentId}`)
      .set(authHeader)
      .send({
        data: {
          status: 'published',
          title: 'Integration Test Blog Post (Published)',
          publishedDate: now,
          slug,
          tags: ['Engineering'],
        },
      });

    if (updateResponse.status !== 200) {
      throw new Error(`Update failed: ${updateResponse.status} ${updateResponse.text}`);
    }
    const updateBody = parseJson<{ data: BlogPostApiEntity }>(updateResponse);
    expect(unwrapBlogPost(updateBody.data).status).toBe('published');

    const documentsApi = (strapi as unknown as {
      documents: (uid: typeof BLOG_POST_UID) => {
        publish: (params: { documentId: string }) => Promise<unknown>;
      };
    }).documents;

    await documentsApi(BLOG_POST_UID).publish({ documentId });

    const waitForPublication = async (attempts = 5) => {
      for (let i = 0; i < attempts; i += 1) {
        const verify = await httpClient.get(`/api/blog-posts/slug/${slug}`);
        if (verify.status === 200) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      throw new Error('Slug not published after retries');
    };

    await waitForPublication();

    const listResponse = await httpClient.get('/api/blog-posts');
    expect(listResponse.status).toBe(200);
    const listBody = parseJson<{ data: BlogPostApiEntity[] }>(listResponse);
    const slugs = listBody.data.map((entry) => unwrapBlogPost(entry).slug);
    expect(slugs).toContain(slug);

    const slugResponse = await httpClient.get(`/api/blog-posts/slug/${slug}`);
    expect(slugResponse.status).toBe(200);
    const slugBody = parseJson<{ data: BlogPostApiEntity }>(slugResponse);
    expect(unwrapBlogPost(slugBody.data).slug).toBe(slug);

    const tagResponse = await httpClient.get('/api/blog-posts/tag/engineering');
    expect(tagResponse.status).toBe(200);
    const tagBody = parseJson<{ data: BlogPostApiEntity[] }>(tagResponse);
    const tagSlugs = tagBody.data.map((entry) => unwrapBlogPost(entry).slug);
    expect(tagSlugs).toContain(slug);

    const deleteResponse = await httpClient.delete(`/api/blog-posts/${documentId}`).set(authHeader);
    expect(deleteResponse.status).toBe(204);

    const slugAfterDeleteResponse = await httpClient.get(`/api/blog-posts/slug/${slug}`);
    expect(slugAfterDeleteResponse.status).toBe(404);

    const listAfterDeleteResponse = await httpClient.get('/api/blog-posts');
    expect(listAfterDeleteResponse.status).toBe(200);
    const listAfterDeleteBody = parseJson<{ data: BlogPostApiEntity[] }>(listAfterDeleteResponse);
    const remainingSlugs = listAfterDeleteBody.data.map((entry) => unwrapBlogPost(entry).slug);
    expect(remainingSlugs).not.toContain(slug);
  });
});
