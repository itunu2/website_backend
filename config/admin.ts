type EnvFn = {
  <T = string>(key: string, defaultValue?: T): T;
  bool(key: string, defaultValue?: boolean): boolean;
};

export default ({ env }: { env: EnvFn }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
    // Replaces deprecated auth.options.expiresIn (removed in Strapi 6)
    sessions: {
      // How long a refresh token remains valid (sliding window resets on activity)
      maxRefreshTokenLifespan: 30 * 24 * 60 * 60 * 1000, // 30 days
      // How long a session JWT is valid before the user must re-authenticate
      maxSessionLifespan: 30 * 60 * 1000, // 30 minutes
    },
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY'),
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
  },
});
