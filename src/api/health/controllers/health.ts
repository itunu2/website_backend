import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';
import strapiPkg from '@strapi/strapi/package.json';

declare const strapi: Core.Strapi;

export default {
  async check(ctx: Context) {
    const database =
      (await strapi.service('api::health.health')?.getDatabaseStatus?.()) ?? ({
        status: 'unknown',
      } as const);

    ctx.body = {
      status: database.status === 'down' ? 'degraded' : 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      strapiVersion: strapiPkg.version,
      timestamp: new Date().toISOString(),
      database,
    };
  },
};
