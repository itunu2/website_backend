import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';
import { env } from '../src/utils/env';

declare const strapi: Core.Strapi;

const defaultAllowedOrigins = ['http://localhost:1337', 'http://localhost:3000'];
const wildcardHosts = [/\.onrender\.com$/, /\.fly\.dev$/];

const explicitOrigins = Array.from(new Set([...defaultAllowedOrigins, ...env.corsOrigins]));

const isWildcardMatch = (originHost: string) => wildcardHosts.some((regex) => regex.test(originHost));

const resolveOrigin = (ctx: Context) => {
  const origin = ctx.request.header.origin;

  if (!origin) {
    return defaultAllowedOrigins[0];
  }

  if (explicitOrigins.includes(origin)) {
    return origin;
  }

  try {
    const { hostname } = new URL(origin);
    if (isWildcardMatch(hostname)) {
      return origin;
    }
  } catch (error) {
    strapi.log.warn('Invalid origin header received', { origin, error });
  }

  return false;
};

export default [
  'global::request-context',
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'img-src': ["'self'", 'data:', 'blob:', 'https://*.supabase.co'],
          'media-src': ["'self'", 'data:', 'blob:', 'https://*.supabase.co'],
          'script-src': ["'self'", "'unsafe-inline'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'frame-ancestors': ["'self'", 'https://render.com', 'https://fly.io'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'no-referrer-when-downgrade' },
      frameguard: { action: 'sameorigin' },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      origin: resolveOrigin,
      exposeHeaders: ['WWW-Authenticate', 'Server-Authorization'],
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
