import { env } from '../src/utils/env';

const maxFileSizeBytes = env.uploadMaxFileSizeMb * 1024 * 1024;
const maxFileSize = `${env.uploadMaxFileSizeMb}mb`;

export default () => ({
  host: env.host,
  port: env.port,
  app: {
    keys: env.appKeys,
  },
  // Limit request body to configured upload max (matches upload plugin/provider)
  body: {
    formLimit: maxFileSize,
    jsonLimit: maxFileSize,
    formidable: {
      maxFileSize: maxFileSizeBytes,
    },
  },
});
