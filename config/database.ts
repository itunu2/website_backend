import path from 'path';
import dns from 'node:dns';
import { env } from '../src/utils/env';

type SupportedClient = 'postgres' | 'mysql' | 'sqlite';

const DEFAULT_POOL = { min: 2, max: 10 };
const SQLITE_FILENAME = (filename: string) => path.join(process.cwd(), filename);

if (env.databaseForceIpv4) {
  dns.setDefaultResultOrder('ipv4first');
}

const normalizeClient = (protocol: string): SupportedClient => {
  switch (protocol.replace(':', '')) {
    case 'postgres':
    case 'postgresql':
      return 'postgres';
    case 'mysql':
    case 'mysql2':
    case 'mariadb':
      return 'mysql';
    case 'sqlite':
      return 'sqlite';
    default:
      throw new Error(`Unsupported database protocol "${protocol}"`);
  }
};

const buildSslConfig = () =>
  env.databaseSsl
    ? {
        rejectUnauthorized: env.databaseSslRejectUnauthorized,
      }
    : undefined;

const sqliteConnection = (filename: string) => ({
  client: 'sqlite' as const,
  connection: {
    filename: SQLITE_FILENAME(filename),
  },
  useNullAsDefault: true,
});

const connectionFromUrl = (databaseUrl: string) => {
  const url = new URL(databaseUrl);
  const client = normalizeClient(url.protocol);

  if (client === 'sqlite') {
    const filename = url.pathname?.replace(/^\//, '') || env.databaseFilename;
    return sqliteConnection(filename);
  }

  const dbName = url.pathname.replace(/^\//, '') || undefined;

  return {
    client,
    connection: {
      connectionString: databaseUrl,
      host: url.hostname,
      port: url.port ? Number(url.port) : client === 'postgres' ? 5432 : 3306,
      database: dbName,
      user: decodeURIComponent(url.username || ''),
      password: decodeURIComponent(url.password || ''),
      ssl: buildSslConfig(),
    },
    pool: DEFAULT_POOL,
  };
};

const connectionFromDiscreteValues = () => {
  const client: SupportedClient = env.databaseClient ?? 'sqlite';

  if (client === 'sqlite') {
    return sqliteConnection(env.databaseFilename);
  }

  if (!env.databaseHost || !env.databaseName || !env.databaseUsername) {
    throw new Error(
      'DATABASE_HOST, DATABASE_NAME, and DATABASE_USERNAME are required when DATABASE_URL is not provided.',
    );
  }

  return {
    client,
    connection: {
      host: env.databaseHost,
      port: env.databasePort ?? (client === 'postgres' ? 5432 : 3306),
      database: env.databaseName,
      user: env.databaseUsername,
      password: env.databasePassword,
      ssl: buildSslConfig(),
    },
    pool: DEFAULT_POOL,
  };
};

export default () => {
  if (!env.databaseUrl && (env.databaseClient ?? 'sqlite') === 'sqlite' && env.nodeEnv === 'development') {
    // eslint-disable-next-line no-console
    console.warn('SQLite is intended for smoke tests only. Configure DATABASE_URL for persistence.');
  }

  const config = (() => {
    if (env.databaseUrl) {
      return connectionFromUrl(env.databaseUrl);
    }

    if (env.databaseClient) {
      return connectionFromDiscreteValues();
    }

    if (env.nodeEnv !== 'production') {
      return sqliteConnection(env.databaseFilename);
    }

    throw new Error(
      'Production database configuration is missing: set DATABASE_URL or define DATABASE_CLIENT with DATABASE_HOST, DATABASE_NAME, and DATABASE_USERNAME.',
    );
  })();

  return {
    connection: {
      ...config,
      acquireConnectionTimeout: 60000,
    },
  };
};
