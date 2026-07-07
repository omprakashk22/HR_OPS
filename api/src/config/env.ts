import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  DATABASE_URL: required('DATABASE_URL'),
  DATABASE_URL_TEST: process.env.DATABASE_URL_TEST ?? '',
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '8h',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
};
