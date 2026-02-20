process.env.NODE_ENV ??= 'test';
process.env.HOST ??= '127.0.0.1';
process.env.PORT = '1450';
process.env.APP_KEYS ??= 'testKey1,testKey2';
process.env.API_TOKEN_SALT ??= 'test-api-token-salt';
process.env.ADMIN_JWT_SECRET ??= 'test-admin-jwt-secret';
process.env.TRANSFER_TOKEN_SALT ??= 'test-transfer-token-salt';
process.env.JWT_SECRET ??= 'test-jwt-secret';
process.env.ENCRYPTION_KEY ??= 'test-encryption-key';
process.env.DATABASE_FILENAME ??= '.tmp/jest-data.db';
process.env.SELF_PING_ENABLED = 'false';

export {};
