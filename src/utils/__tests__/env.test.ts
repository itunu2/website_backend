import { loadEnv } from '../env';

describe('loadEnv', () => {
  const baseEnv: NodeJS.ProcessEnv = {
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: '1337',
    APP_KEYS: 'key1,key2',
    API_TOKEN_SALT: 'api-token-salt-value',
    ADMIN_JWT_SECRET: 'admin-jwt-secret-value',
  };

  it('parses and normalizes environment variables', () => {
    const config = loadEnv({
      ...baseEnv,
      CORS_ORIGINS: 'https://example.com,https://app.fly.dev',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/itunus',
    });

    expect(config.appKeys).toEqual(['key1', 'key2']);
    expect(config.corsOrigins).toEqual(['https://example.com', 'https://app.fly.dev']);
    expect(config.databaseUrl).toBe('postgres://user:pass@localhost:5432/itunus');
    expect(config.host).toBe('127.0.0.1');
    expect(config.port).toBe(1337);
  });

  it('throws a descriptive error when required values are missing', () => {
    expect(() =>
      loadEnv({
        ...baseEnv,
        APP_KEYS: '',
      }),
    ).toThrow(/APP_KEYS/);
  });
});
