#!/bin/sh
set -e

echo "Applying database migrations…"
npx prisma migrate deploy

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "Seeding database (skips if already populated)…"
  npx prisma db seed
fi

echo "Starting API on port ${PORT:-4000}…"
exec node dist/server.js
