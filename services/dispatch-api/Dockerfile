# Sovereign Dispatch — API image (R4). Independent of the Polished Pages SPA.
# Build context = repository root:
#   docker build -f services/dispatch-api/Dockerfile -t dispatch-api .
FROM node:20-slim AS base
ENV NODE_ENV=production
WORKDIR /app

# Frozen DDM validator + its own deps (the API validates every request).
COPY packages/ddm-schema/package.json packages/ddm-schema/package-lock.json ./packages/ddm-schema/
RUN cd packages/ddm-schema && npm ci --omit=dev --no-audit --no-fund
COPY packages/ ./packages/

# Service workspace (shared + api only — the SPA is never copied).
COPY services/package.json ./services/package.json
COPY services/shared ./services/shared
COPY services/dispatch-api ./services/dispatch-api
RUN cd services && npm install --omit=dev --no-audit --no-fund

EXPOSE 8787
USER node
CMD ["node", "services/dispatch-api/src/server.mjs"]
