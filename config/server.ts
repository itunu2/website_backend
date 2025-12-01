import { env } from '../src/utils/env';

export default () => ({
  host: env.host,
  port: env.port,
  app: {
    keys: env.appKeys,
  },
});
