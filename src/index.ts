import type { Core } from '@strapi/strapi';
import { shutdownCache } from './utils/cache';
import { env } from './utils/env';
import { syncBlogPostStatuses } from './api/blog-post/utils/status-sync';

// Normal ping interval: random between 3–5 minutes.
// Randomness prevents the requests looking like a bot heartbeat to upstream infrastructure.
// Render free tier spins down after 15 min of inactivity — 3–5 min gives a comfortable buffer.
const PING_MIN_MS = 3 * 60 * 1000;
const PING_MAX_MS = 5 * 60 * 1000;
const randomPingInterval = () =>
  Math.round(PING_MIN_MS + Math.random() * (PING_MAX_MS - PING_MIN_MS));

// On failure, retry aggressively: 30s → 1min → 2min.
// This prevents the 15-minute inactivity window from expiring even during a partial outage.
const RETRY_DELAYS_MS = [30_000, 60_000, 2 * 60_000];

const PING_TIMEOUT_MS = 10_000;

const getNextDelay = (consecutiveFailures: number): number =>
  consecutiveFailures === 0
    ? randomPingInterval()
    : RETRY_DELAYS_MS[Math.min(consecutiveFailures - 1, RETRY_DELAYS_MS.length - 1)];

const setupSelfPing = (strapi: Core.Strapi) => {
  if (!env.selfPingEnabled) {
    return;
  }

  // PUBLIC_BASE_URL MUST be the external Render URL (e.g. https://your-app.onrender.com).
  // Loopback (http://0.0.0.0:PORT) bypasses Render's proxy — Render ignores loopback traffic
  // for activity tracking and WILL still spin down the instance.
  if (!env.publicBaseUrl) {
    strapi.log.error(
      '[self_ping] SELF_PING_ENABLED=true but PUBLIC_BASE_URL is not set. ' +
        'Falling back to loopback which Render IGNORES — the instance will still spin down. ' +
        'Set PUBLIC_BASE_URL=https://your-app.onrender.com in Render environment variables.'
    );
  }

  const baseUrl = env.publicBaseUrl ?? `http://${env.host}:${env.port}`;
  const isLoopback = !env.publicBaseUrl;
  const healthUrl = `${baseUrl.replace(/\/$/, '')}/api/health`;

  let timer: ReturnType<typeof setTimeout> | undefined;
  let consecutiveFailures = 0;
  let destroyed = false;

  const schedule = (delayMs: number) => {
    if (destroyed) return;
    timer = setTimeout(() => { void runPing(); }, delayMs);
  };

  const runPing = async () => {
    const start = Date.now();
    try {
      const res = await fetch(healthUrl, { signal: AbortSignal.timeout(PING_TIMEOUT_MS) });
      const durationMs = Date.now() - start;

      // Parse body to detect degraded state (e.g. DB down but HTTP 200)
      let body: { status?: string } = {};
      try { body = await res.json(); } catch { /* non-JSON response — ignore */ }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      if (body.status === 'degraded') {
        // Service is up (Render won't spin down) but something is wrong internally
        strapi.log.warn(
          `[self_ping] DEGRADED — service is alive but unhealthy (${durationMs}ms). ` +
            'Check database connection.'
        );
        // Count as a soft failure so we retry sooner than normal
        consecutiveFailures = Math.max(consecutiveFailures, 1);
      } else {
        if (consecutiveFailures > 0) {
          strapi.log.info(`[self_ping] RECOVERED after ${consecutiveFailures} failure(s) — ${durationMs}ms`);
        } else {
          strapi.log.info(`[self_ping] OK — ${durationMs}ms${isLoopback ? ' ⚠ loopback (ineffective on Render)' : ''}`);
        }
        consecutiveFailures = 0;
      }
    } catch (err) {
      consecutiveFailures += 1;
      const message = err instanceof Error ? err.message : String(err);
      const retryIn = getNextDelay(consecutiveFailures);
      strapi.log.error(
        `[self_ping] FAILED #${consecutiveFailures} — ${message} | ` +
          `retrying in ${retryIn / 1000}s${isLoopback ? ' ⚠ loopback mode' : ''}`
      );
      schedule(retryIn);
      return; // skip the normal schedule below
    }

    schedule(getNextDelay(consecutiveFailures));
  };

  // First ping after Strapi finishes booting (give it 12s to settle)
  schedule(12_000);

  strapi.server.httpServer?.once('close', () => {
    destroyed = true;
    if (timer) clearTimeout(timer);
  });

  strapi.log.info(
    `[self_ping] Enabled — url=${healthUrl} interval=${PING_MIN_MS / 60_000}–${PING_MAX_MS / 60_000}min (randomised, ~${Math.round((PING_MIN_MS + PING_MAX_MS) / 2 / 60_000)}min avg) ` +
      `retrySequence=${RETRY_DELAYS_MS.map(d => d / 1000 + 's').join('→')} firstPing=12s` +
      (isLoopback ? ' ⚠ WARNING: using loopback — set PUBLIC_BASE_URL!' : '')
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
