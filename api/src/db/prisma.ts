import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

// In tests, point the app's client at the dedicated test database so
// integration tests never touch dev data.
const url = env.NODE_ENV === 'test' ? env.DATABASE_URL_TEST : env.DATABASE_URL;

export const prisma = new PrismaClient({ datasources: { db: { url } } });
