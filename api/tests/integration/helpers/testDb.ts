import { prisma } from '../../../src/db/prisma';

// Guard: resetDb TRUNCATEs everything, so it must only ever run against the
// test database. NODE_ENV=test is what points `prisma` at DATABASE_URL_TEST.
if (process.env.NODE_ENV !== 'test') {
  throw new Error('Integration test helpers require NODE_ENV=test');
}

export { prisma };

export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "SalaryHistory", "Employee", "User", "CurrencyRate" RESTART IDENTITY CASCADE',
  );
}
