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
  const baseIntervalMs = env.selfPingIntervalMinutes * 60 * 1000;

  // Add ±30% jitter so pings look organic, not like a fixed cron
  const jitter = () => {
    const variance = baseIntervalMs * 0.3;
    return baseIntervalMs + (Math.random() * 2 - 1) * variance;
  };

  let timer: ReturnType<typeof setTimeout>;

  const scheduleTick = () => {
    const nextMs = Math.round(jitter());

    timer = setTimeout(async () => {
      try {
        const start = Date.now();
        const res = await fetch(healthUrl, { signal: AbortSignal.timeout(10_000) });
        const durationMs = Date.now() - start;
        strapi.log.debug('self_ping.ok', { healthUrl, status: res.status, durationMs });
      } catch (error) {
        strapi.log.warn('self_ping.failed', {
          healthUrl,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      // Schedule next ping regardless of success/failure
      scheduleTick();
    }, nextMs);
  };

  scheduleTick();
  strapi.server.httpServer?.once('close', () => clearTimeout(timer));
  strapi.log.info('Self-ping scheduler enabled', {
    healthUrl,
    baseIntervalMs,
    jitterRange: '±30%',
  });
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
