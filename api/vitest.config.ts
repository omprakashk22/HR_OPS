import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['dotenv/config'],
    testTimeout: 10000,
    // NODE_ENV=test points the Prisma client at the test database.
    env: { NODE_ENV: 'test' },
    // Integration tests share one test DB and TRUNCATE between tests, so
    // files must not run concurrently and clobber each other's fixtures.
    fileParallelism: false,
  },
});
