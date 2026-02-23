import { z } from 'zod';

const csvToArray = (value?: string) =>
  value
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];

const toBoolean = (value?: string | number | boolean) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (!value) {
    return false;
  }

  return ['true', '1', 'yes'].includes(String(value).toLowerCase());
};

const sanitizeOptionalString = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim() || undefined;
  }

  return trimmed;
};

const isCompactJws = (value: string) =>
  /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(0).max(65535).default(1337),
  APP_KEYS: z.string().min(1, { message: 'APP_KEYS is required (comma-separated values)' }),
  API_TOKEN_SALT: z.string().min(1, { message: 'API_TOKEN_SALT is required' }),
  ADMIN_JWT_SECRET: z.string().min(1, { message: 'ADMIN_JWT_SECRET is required' }),
  TRANSFER_TOKEN_SALT: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
  DATABASE_URL: z.string().url().optional(),
  DATABASE_CLIENT: z.enum(['postgres', 'mysql', 'sqlite']).optional(),
  DATABASE_HOST: z.string().optional(),
  DATABASE_PORT: z.coerce.number().int().optional(),
  DATABASE_NAME: z.string().optional(),
  DATABASE_USERNAME: z.string().optional(),
  DATABASE_PASSWORD: z.string().optional(),
  DATABASE_SSL: z.any().optional(),
  DATABASE_SSL_REJECT_UNAUTHORIZED: z.any().optional(),
  DATABASE_FILENAME: z.string().default('.tmp/data.db'),
  CORS_ORIGINS: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('strapi-uploads'),
  REDIS_URL: z.string().url().optional(),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  SELF_PING_ENABLED: z.any().optional(),
  SELF_PING_INTERVAL_MINUTES: z.coerce.number().int().min(1).default(10),
  PUBLIC_BASE_URL: z.string().url().optional(),
  UPLOAD_MAX_FILE_SIZE_MB: z.coerce.number().int().positive().max(100).default(25),
});

const envSchema = rawEnvSchema.transform((value) => {
  const appKeys = csvToArray(value.APP_KEYS);

  return {
    nodeEnv: value.NODE_ENV,
    host: value.HOST,
    port: value.PORT,
    appKeys,
    apiTokenSalt: value.API_TOKEN_SALT,
    adminJwtSecret: value.ADMIN_JWT_SECRET,
    transferTokenSalt: value.TRANSFER_TOKEN_SALT,
    jwtSecret: value.JWT_SECRET,
    encryptionKey: value.ENCRYPTION_KEY,
    databaseUrl: value.DATABASE_URL,
    databaseClient: value.DATABASE_CLIENT,
    databaseHost: value.DATABASE_HOST,
    databasePort: value.DATABASE_PORT,
    databaseName: value.DATABASE_NAME,
    databaseUsername: value.DATABASE_USERNAME,
    databasePassword: value.DATABASE_PASSWORD,
    databaseSsl: toBoolean(value.DATABASE_SSL),
    databaseSslRejectUnauthorized: toBoolean(value.DATABASE_SSL_REJECT_UNAUTHORIZED ?? true),
    databaseFilename: value.DATABASE_FILENAME,
    corsOrigins: csvToArray(value.CORS_ORIGINS),
    supabase: {
      url: value.SUPABASE_URL,
      serviceRoleKey: value.SUPABASE_SERVICE_ROLE_KEY,
      storageBucket: value.SUPABASE_STORAGE_BUCKET,
    },
    redisUrl: value.REDIS_URL,
    cacheTtlSeconds: value.CACHE_TTL_SECONDS,
    selfPingEnabled: toBoolean(value.SELF_PING_ENABLED),
    selfPingIntervalMinutes: value.SELF_PING_INTERVAL_MINUTES,
    publicBaseUrl: value.PUBLIC_BASE_URL,
    uploadMaxFileSizeMb: value.UPLOAD_MAX_FILE_SIZE_MB,
  } as const;
});

export type EnvConfig = z.infer<typeof envSchema>;

export const loadEnv = (environment: NodeJS.ProcessEnv = process.env): EnvConfig => {
  const result = envSchema.safeParse(environment);

  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Environment validation failed: ${message}`);
  }

  if (result.data.appKeys.length === 0) {
    throw new Error('Environment validation failed: APP_KEYS must include at least one key');
  }

  const supabaseUrl = sanitizeOptionalString(result.data.supabase.url);
  const supabaseServiceRoleKey = sanitizeOptionalString(result.data.supabase.serviceRoleKey);
  const hasSupabaseUrl = Boolean(supabaseUrl);
  const hasSupabaseServiceRoleKey = Boolean(supabaseServiceRoleKey);

  if (hasSupabaseUrl !== hasSupabaseServiceRoleKey) {
    throw new Error(
      'Environment validation failed: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set together'
    );
  }

  if (supabaseServiceRoleKey && !isCompactJws(supabaseServiceRoleKey)) {
    throw new Error(
      'Environment validation failed: SUPABASE_SERVICE_ROLE_KEY must be a valid JWT (compact JWS). Do not wrap it in quotes and ensure there are no line breaks.'
    );
  }

  return Object.freeze({
    ...result.data,
    supabase: {
      ...result.data.supabase,
      url: supabaseUrl,
      serviceRoleKey: supabaseServiceRoleKey,
    },
  });
};

export const env = loadEnv();
