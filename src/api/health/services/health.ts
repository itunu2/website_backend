import type { Core } from '@strapi/strapi';

declare const strapi: Core.Strapi;

type DatabaseStatus = {
  status: 'up' | 'down';
  latencyMs?: number;
  error?: string;
};

export default () => ({
  async getDatabaseStatus(): Promise<DatabaseStatus> {
    const start = Date.now();

    try {
      await strapi.db.connection?.raw?.('select 1');
      return {
        status: 'up',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      strapi.log.error('Database health check failed', { error });
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
