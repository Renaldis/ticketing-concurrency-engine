#!/bin/sh
set -e

# Run Prisma migrations if DATABASE_URL is available
if [ -n "$DATABASE_URL" ]; then
  echo "Applying database migrations..."
  npx prisma migrate deploy || echo "Migration warning: could not run migrate deploy, proceeding..."
fi

# Execute main process (node dist/index.js)
exec "$@"
