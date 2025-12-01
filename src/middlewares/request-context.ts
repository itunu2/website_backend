import type { Core } from '@strapi/strapi';
import type { Context, Next } from 'koa';
import { v4 as uuid } from 'uuid';

declare const strapi: Core.Strapi;

export default () => {
  return async (ctx: Context, next: Next) => {
    const requestId = ctx.get('x-request-id') || uuid();
    ctx.state.requestId = requestId;
    ctx.set('X-Request-ID', requestId);

    const startedAt = Date.now();
    try {
      await next();
      strapi.log.info('request.completed', {
        requestId,
        method: ctx.method,
        path: ctx.path,
        status: ctx.status,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      strapi.log.error('request.failed', {
        requestId,
        method: ctx.method,
        path: ctx.path,
        status: ctx.status,
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  };
};
