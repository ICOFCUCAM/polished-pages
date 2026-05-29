# Infrastructure Ownership Report — Sovereign Dispatch

- Date: 2026-05-29
- Purpose: enumerate every infrastructure concern Dispatch depends on and state,
  for each, **who owns it after the autonomy work** — confirming nothing is
  owned by the Polished Pages host.

## Ownership ledger

| Concern | Before (host-coupled) | After (Dispatch-owned) | Artifact |
|---|---|---|---|
| Schema definition | `db/migrations/*` (no runner) | same, **forward-only + manifest** | `db/migrations/`, `db/migrations/manifest.json` |
| Schema application | host (Lovable/Supabase) tooling | **Dispatch runner** | `db/migrate.mjs`, `db/package.json` |
| Migration tracking | none | `public._dispatch_migrations` (sha256) | `db/migrate.mjs` |
| AuthN (request) | dev shim only (R-S1-1) | **HS256 JWT verify** | `services/shared/src/{jwt,auth}.mjs` |
| AuthN (token mint) | none | **client-credentials `/v1/token`** | `services/dispatch-api/src/server.mjs` |
| Service config | host `.env` (VITE/Supabase) | **Dispatch `.env`** | `services/.env.example` |
| Database runtime | implied host project | **own Postgres** | `docker-compose.yml` (`dispatch-db`) |
| API image | none | **own image** | `services/dispatch-api/Dockerfile` |
| Worker image | none | **own image** | `services/dispatch-worker/Dockerfile` |
| Migrate image | none | **own image** | `db/Dockerfile` |
| Image hygiene | n/a | SPA excluded from context | `.dockerignore` |
| CI/CD | host pipeline | **own, path-scoped workflow** | `.github/workflows/dispatch-ci.yml` |
| Package manifests | missing (uninstallable) | **complete** | `services/{shared,dispatch-api,dispatch-worker}/package.json` |

## Database topology

- Dispatch services connect via `PGHOST/PGPORT/PGDATABASE/DISPATCH_DB_USER`
  (`services/shared/src/db.mjs` `makePool`) as the **unprivileged `dispatch_app`**
  role, so RLS is enforced for application queries (ADR-003).
- The migration runner uses a **separate** admin DSN (`DISPATCH_MIGRATE_URL`)
  with DDL + CREATE ROLE rights, used by nothing else.
- Verified schema (built by the Dispatch runner): 10 tables (RLS enabled **and**
  forced on all), 17 policies, 31 indexes, 2 narrow SECURITY DEFINER functions.

## Secrets owned by Dispatch

`DISPATCH_TOKEN_SECRET` (service JWT signing), `DISPATCH_TOKEN_ISSUER`,
`DISPATCH_TOKEN_TTL_SEC`, optional `SUPABASE_JWT_SECRET` (only to accept a
Supabase project's user tokens), `CALLBACK_HMAC_SECRET`, DB credentials. None of
these are the Polished Pages SPA's secrets.

## Not owned / explicitly external (by design)

- **Sovereign OIDC** — future issuer (ADR-002 path); not yet present.
- **Object storage / signed URLs, PDF/A tooling, headless Chromium** — Sprint 2
  / Phase 3 (out of scope here).
- A managed Postgres provider for production is a deployment choice; the runner +
  compose work against any Postgres 16.

## Conclusion

Every infrastructure concern Dispatch needs to **build, migrate, authenticate,
and run** is now owned by Dispatch and parameterized through Dispatch-only
configuration. No concern is owned by, or routed through, the Polished Pages
host.
