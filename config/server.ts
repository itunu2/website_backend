import { env } from '../src/utils/env';

export default () => ({
  host: env.host,
  port: env.port,
  app: {
    keys: env.appKeys,
  },
  // Limit request body to 10 MB (matches upload file size limit)
  body: {
    formLimit: '10mb',
    jsonLimit: '10mb',
    formidable: {
      maxFileSize: 10 * 1024 * 1024, // 10 MB
    },
  },
});
