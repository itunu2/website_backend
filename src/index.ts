import type { Core } from '@strapi/strapi';
import { shutdownCache } from './utils/cache';
import { env } from './utils/env';
import { syncBlogPostStatuses } from './api/blog-post/utils/status-sync';

const setupSelfPing = (strapi: Core.Strapi) => {
  if (!env.selfPingEnabled) {
    return;
  }

  const baseUrl = env.publicBaseUrl ?? `http://${env.host}:${env.port}`;
  const healthUrl = `${baseUrl.replace(/\/$/, '')}/api/health`;
  const intervalMs = env.selfPingIntervalMinutes * 60 * 1000;

  const tick = async () => {
    try {
      await fetch(healthUrl);
      strapi.log.debug('self_ping.ok', { healthUrl });
    } catch (error) {
      strapi.log.warn('self_ping.failed', {
        healthUrl,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const timer = setInterval(tick, intervalMs);
  strapi.server.httpServer?.once('close', () => clearInterval(timer));
  strapi.log.info('Self-ping scheduler enabled', { healthUrl, intervalMs });
};

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    strapi.server.httpServer?.once('close', () => {
      shutdownCache();
    });
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    setupSelfPing(strapi);
    await syncBlogPostStatuses(strapi);
  },
};
