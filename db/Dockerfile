# Sovereign Dispatch — migration runner image (R1/R4).
# One-shot container that applies db/migrations in canonical order via psql.
# Build context = repository root:
#   docker build -f db/Dockerfile -t dispatch-migrate .
FROM node:20-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY db ./db
# DISPATCH_MIGRATE_URL is supplied at run time (admin/owner DSN).
CMD ["node", "db/migrate.mjs", "up"]
