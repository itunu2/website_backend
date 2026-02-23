import type { Core } from '@strapi/strapi';
import { shutdownCache } from './utils/cache';
import { env } from './utils/env';
import { syncBlogPostStatuses } from './api/blog-post/utils/status-sync';

const SELF_PING_MIN_INTERVAL_MS = 7 * 60 * 1000;
const SELF_PING_MAX_INTERVAL_MS = 10 * 60 * 1000;

const setupSelfPing = (strapi: Core.Strapi) => {
  if (!env.selfPingEnabled) {
    return;
  }

  const baseUrl = env.publicBaseUrl ?? `http://${env.host}:${env.port}`;
  const healthUrl = `${baseUrl.replace(/\/$/, '')}/api/health`;

  const randomIntervalMs = () =>
    Math.round(
      SELF_PING_MIN_INTERVAL_MS +
        Math.random() * (SELF_PING_MAX_INTERVAL_MS - SELF_PING_MIN_INTERVAL_MS)
    );

  let timer: ReturnType<typeof setTimeout> | undefined;

  const runPing = async () => {
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
    } finally {
      scheduleTick();
    }
  };

  const scheduleTick = (delayMs = randomIntervalMs()) => {
    timer = setTimeout(() => {
      void runPing();
    }, delayMs);
  };

  scheduleTick(15_000);
  strapi.server.httpServer?.once('close', () => {
    if (timer) {
      clearTimeout(timer);
    }
  });
  strapi.log.info('Self-ping scheduler enabled', {
    healthUrl,
    firstPingDelayMs: 15_000,
    minIntervalMs: SELF_PING_MIN_INTERVAL_MS,
    maxIntervalMs: SELF_PING_MAX_INTERVAL_MS,
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
