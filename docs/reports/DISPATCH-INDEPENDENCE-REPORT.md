# Dispatch Independence Report

- Date: 2026-05-29
- Question answered: *If Polished Pages is archived/deleted, does anything in
  Sovereign Dispatch (or its consumers Emergency AI / Veritas) break?*
- Answer: **No.** Dispatch has no remaining runtime or build dependency on the
  Polished Pages SPA or its Supabase project.

## Coupling matrix (verified by static analysis on this branch)

| Direction | What was checked | Result |
|---|---|---|
| SPA `src/` → Dispatch | imports of `@dispatch/*`, `../services`, `../db/` | **NONE** |
| Dispatch `services\|packages\|db` → SPA | imports of `../src/`, `@/components`, `@/integrations`, `@/lib` | **NONE** |
| Dispatch → Polished Pages Supabase project | `uaoctiyghslkezowphtt`, `*.supabase.co`, `VITE_*` | **NONE** |
| Dispatch → Lovable AI gateway | `gateway.lovable`, `LOVABLE_API_KEY` | **NONE** |
| Dispatch → SPA edge functions | `supabase/functions`, `export-docx`, `generate-cv` | **NONE** |

The only intra-repo edges from Dispatch are **internal**: services → `shared`,
api → `@dispatch/ddm-schema`, tests → worker/shared, and ddm-schema test →
its own validator. All live under `services/`, `packages/`, `db/`.

## What independence now rests on

1. **Schema** — provisioned by the Dispatch-owned runner (`db/migrate.mjs`)
   against any Postgres via `DISPATCH_MIGRATE_URL`. No host migration tooling.
2. **Auth** — HS256 JWT verification + client-credentials `/v1/token`, keyed by
   Dispatch's own `DISPATCH_TOKEN_SECRET` (and optionally a Supabase project's
   `SUPABASE_JWT_SECRET` only if it chooses to accept UI tokens). The dev shim
   cannot be used in production.
3. **Config** — `services/.env.example`; Dispatch reads only its own variables.
4. **Build/run** — three Dockerfiles + compose; the SPA is excluded by
   `.dockerignore` and never enters an image.
5. **CI** — path-scoped workflow that ignores the SPA entirely.

## Consumer impact (Emergency AI / Veritas)

Emergency AI is a **service** caller: it authenticates via client-credentials
(`POST /v1/token`) and submits documents with a Bearer JWT — a path that now
exists and is verified, and that depends only on Dispatch + its Postgres.
Veritas integration remains Phase-3 (accepted, inert) and is unaffected. Neither
consumer touches the Polished Pages SPA.

## Residual (not blocking independence)

- The Dispatch code still physically lives in the `polished-pages` git
  repository (separate branch). Independence is achieved logically; a physical
  repo split is a recommended follow-up (ADR-009 future path).
- Service-secret at-rest hashing is sha256 (argon2 residual).

## Conclusion

Archiving Polished Pages (the SPA and its Supabase/Lovable project) removes
nothing that Sovereign Dispatch needs to build, migrate, authenticate, or run.
**Independence: confirmed.**
