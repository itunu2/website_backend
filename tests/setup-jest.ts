import { jest } from '@jest/globals';

jest.mock('uuid', () => ({
  v4: () => '00000000-0000-4000-8000-000000000000',
}));
