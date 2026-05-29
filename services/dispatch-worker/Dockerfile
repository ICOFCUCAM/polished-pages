# Sovereign Dispatch — worker image (R4). Independent of the Polished Pages SPA.
# Build context = repository root:
#   docker build -f services/dispatch-worker/Dockerfile -t dispatch-worker .
#
# NOTE: Sprint 2 adds headless Chromium + PDF/A tooling here (ADR-001). That is
# OUT OF SCOPE for the autonomy work — this image runs the Sprint-1 backbone
# worker (claim / status / retry / DLQ / signed callbacks) only.
FROM node:20-slim AS base
ENV NODE_ENV=production
WORKDIR /app

COPY services/package.json ./services/package.json
COPY services/shared ./services/shared
COPY services/dispatch-worker ./services/dispatch-worker
RUN cd services && npm install --omit=dev --no-audit --no-fund

USER node
CMD ["node", "services/dispatch-worker/src/worker.mjs"]
