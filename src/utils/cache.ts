import Redis from 'ioredis';
import { env } from './env';

type CacheValue = unknown;

type Driver = {
  enabled: boolean;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
};

const TTL = env.cacheTtlSeconds;

let redisClient: Redis | null = null;

const createRedisDriver = (): Driver => {
  const client = new Redis(env.redisUrl as string, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
  });

  redisClient = client;

  client.on('error', (error) => {
    // Note: Redis client errors are handled internally
    // For production monitoring, integrate with your logging service
    if (process.env.NODE_ENV === 'development') {
      console.error('Redis error', error); // eslint-disable-line no-console
    }
  });

  return {
    enabled: true,
    async get<T>(key: string) {
      const value = await client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    },
    async set<T>(key: string, value: T, ttlSeconds: number) {
      await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    },
    async delete(key: string) {
      await client.del(key);
    },
  };
};

const inMemoryStore = new Map<string, { value: CacheValue; expiresAt: number }>();

const createMemoryDriver = (): Driver => ({
  enabled: false,
  async get<T>(key: string) {
    const record = inMemoryStore.get(key);
    if (!record) {
      return null;
    }

    if (record.expiresAt < Date.now()) {
      inMemoryStore.delete(key);
      return null;
    }

    return record.value as T;
  },
  async set<T>(key: string, value: T, ttlSeconds: number) {
    inMemoryStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  },
  async delete(key: string) {
    inMemoryStore.delete(key);
  },
});

const driver: Driver = env.redisUrl ? createRedisDriver() : createMemoryDriver();

export const cache = {
  isEnabled: () => driver.enabled,
  async get<T>(key: string) {
    return driver.get<T>(key);
  },
  async set<T>(key: string, value: T, ttlSeconds: number = TTL) {
    await driver.set(key, value, ttlSeconds);
  },
  async delete(key: string) {
    await driver.delete(key);
  },
};

export const shutdownCache = async () => {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.quit();
  } catch (error) {
    // Graceful shutdown, log only in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to close Redis connection', error); // eslint-disable-line no-console
    }
  }
};
