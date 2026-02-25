import type { Core } from '@strapi/strapi';
import { shutdownCache } from './utils/cache';
import { env } from './utils/env';
import { syncBlogPostStatuses } from './api/blog-post/utils/status-sync';

const SELF_PING_MIN_INTERVAL_MS = 5 * 60 * 1000;
const SELF_PING_MAX_INTERVAL_MS = 8 * 60 * 1000;

const setupSelfPing = (strapi: Core.Strapi) => {
  if (!env.selfPingEnabled) {
    return;
  }

  // PUBLIC_BASE_URL MUST be the external Render URL (e.g. https://strapi-backend-xxxx.onrender.com).
  // Without it, the ping falls back to http://0.0.0.0:<port> which is a loopback request that
  // bypasses Render's proxy — Render does NOT count loopback traffic as activity and will still
  // spin down the instance after 15 minutes of no external requests.
  if (!env.publicBaseUrl) {
    strapi.log.error(
      '⚠ SELF_PING_ENABLED=true but PUBLIC_BASE_URL is NOT set. ' +
        'Self-ping will use loopback (http://0.0.0.0:' + env.port + ') which Render IGNORES for activity tracking. ' +
        'Set PUBLIC_BASE_URL to your external Render URL (e.g. https://your-app.onrender.com) ' +
        'or the instance WILL spin down despite self-pinging.'
    );
  }

  const baseUrl = env.publicBaseUrl ?? `http://${env.host}:${env.port}`;
  const isLoopback = !env.publicBaseUrl;
  const healthUrl = `${baseUrl.replace(/\/$/, '')}/api/health`;

  const randomIntervalMs = () =>
    Math.round(
      SELF_PING_MIN_INTERVAL_MS +
        Math.random() * (SELF_PING_MAX_INTERVAL_MS - SELF_PING_MIN_INTERVAL_MS)
    );

  let timer: ReturnType<typeof setTimeout> | undefined;
  let consecutiveFailures = 0;

  const runPing = async () => {
    try {
      const start = Date.now();
      const res = await fetch(healthUrl, { signal: AbortSignal.timeout(15_000) });
      const durationMs = Date.now() - start;
      consecutiveFailures = 0;
      strapi.log.info(`self_ping OK — status=${res.status} duration=${durationMs}ms url=${healthUrl}${isLoopback ? ' ⚠ LOOPBACK (will not prevent Render spin-down)' : ''}`);
    } catch (error) {
      consecutiveFailures += 1;
      const message = error instanceof Error ? error.message : 'Unknown error';
      strapi.log.error(
        `self_ping FAILED (#${consecutiveFailures}) — url=${healthUrl} error=${message}${isLoopback ? ' ⚠ LOOPBACK MODE' : ''}`
      );
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
  strapi.log.info(
    `Self-ping scheduler enabled — url=${healthUrl} interval=${SELF_PING_MIN_INTERVAL_MS / 60000}-${SELF_PING_MAX_INTERVAL_MS / 60000}min firstPing=15s${isLoopback ? ' ⚠ WARNING: using loopback — set PUBLIC_BASE_URL!' : ''}`
  );
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
