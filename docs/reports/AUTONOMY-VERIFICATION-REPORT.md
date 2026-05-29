# Autonomy Verification Report — Sovereign Dispatch

- Date: 2026-05-29
- Branch: `claude/pensive-hawking-6OjUP` (authoritative Dispatch branch)
- Scope: ADR-009 autonomy plan — R1–R6. **Sprint 2 NOT started; Dispatch Engine,
  PDF, and DOCX rendering NOT implemented** (constraints honored).
- Environment: Node v22.22.2, PostgreSQL 16.13, Docker 29.3.1. Deps installed
  from the public npm registry (the Lovable proxy is restricted).
- State: committed **locally only**, not pushed. `c37fa85` not created/pushed.

## Verdict: PASS

All six autonomy work items are implemented and verified against the **running,
changed code** on real infrastructure. The success condition holds: **Polished
Pages can be archived with zero impact on Sovereign Dispatch, Emergency AI, or
Veritas Operations** (severance evidence below).

---

## R1 — Migration runner — PASS

- Added `db/migrate.mjs` (psql-based, no Node DB driver), `db/migrations/manifest.json`
  (canonical order — RLS `M2` applied **after** tables `M3/M4`), `db/package.json`.
- Tracks applied migrations in `public._dispatch_migrations` with SHA-256;
  forward-only; idempotent; drift-detecting.

Evidence (live, against PostgreSQL 16):
```
status (fresh db): 5 pending, 0 applied
up:  applying M1__identity_core / M3__documents / M4__jobs_artifacts_audit /
     M2__rls_policies / M5__roles_grants ... ok
status (after):    0 pending, 5 applied
up (again):        already up to date.        # idempotent
drift test (tampered checksum): "drift: M1 changed after being applied" exit=3
schema built:      10 tables, all RLS-forced=true; 17 policies; 31 indexes;
                   2 SECURITY DEFINER fns (lookup_service_client, claim_next_job)
```

## R2 — Production authentication — PASS

- Added `services/shared/src/jwt.mjs` — dependency-free HS256 sign/verify
  (node:crypto) with exp/nbf/issuer checks, constant-time signature compare,
  and `alg:none` rejection.
- Reworked `services/shared/src/auth.mjs` (same `{principal}|{error}` contract):
  Bearer-JWT verification is the production path (service JWT via
  `DISPATCH_TOKEN_SECRET`, Supabase user JWT via `SUPABASE_JWT_SECRET`); svc
  client-credentials retained with **constant-time** secret compare; the `user`
  trust shim is disabled when `NODE_ENV=production`.
- Added `POST /v1/token` (client-credentials → short-lived JWT) to the API.

Evidence — JWT unit (live, 7/7): valid verifies; wrong-secret/tampered →
`BAD_SIGNATURE`; expired → `EXPIRED`; issuer mismatch → `ISSUER`; `alg=none` →
rejected.

Evidence — production path end-to-end (live API):
```
POST /v1/token {svc-a, secret-A}        -> 200, 3-segment JWT, scopes resolved
POST /v1/validate  Bearer <jwt>         -> 200 valid=true
POST /v1/token {svc-a, WRONG}           -> 401
POST /v1/validate  Bearer <tampered>    -> 401
POST /v1/validate  (no Authorization)   -> 401
```

## R3 — Dedicated Dispatch infrastructure — PASS

- Added `services/.env.example` — Dispatch-owned config (own DB DSNs, token
  secrets), explicitly separate from the SPA's root `.env` (VITE_/Supabase).
- Added `docker-compose.yml` — a self-contained stack (own Postgres + migrate +
  api + worker) with **no** reference to the Polished Pages Supabase project.
- `docker compose config` validates (exit 0).

## R4 — Independent containerization — PASS (config-validated; images not built here)

- Added `services/dispatch-api/Dockerfile`, `services/dispatch-worker/Dockerfile`,
  `db/Dockerfile`, and root `.dockerignore` (excludes `src/`, `supabase/`,
  `index.html`, vite/tailwind config — the SPA is never in any image).

Evidence:
```
docker compose config            -> exit 0 (compose + service graph valid)
docker build -f db/Dockerfile .  -> NOT RUN: no Docker daemon in this environment
                                    (/var/run/docker.sock absent)
```
The image contents (the same `node db/migrate.mjs` + service entrypoints) are
exercised natively above (R1) and in CI (R5). First real image build occurs on a
Docker host / in the CI runner. **Honest gap: images were not built or run here.**

## R5 — Independent CI/CD — PASS

- Added `.github/workflows/dispatch-ci.yml`, path-scoped to
  `services/** packages/** db/**`; provisions Postgres → runs the migration
  runner → schema gate → API → 13 E2E + 3 retry tests. Does **not** build the SPA.
- YAML validates (`yaml.safe_load` OK). The workflow runs the **exact** command
  sequence reproduced natively in this report (below), so a green PR predicts a
  green pipeline.

## R6 — Cleanup / severance — PASS

- Added the three missing workspace manifests (`services/shared`,
  `services/dispatch-api`, `services/dispatch-worker`) so the Dispatch tree
  installs/builds standalone; each Dispatch package owns its deps.
- Severance verified **zero coupling in both directions** (see Dispatch
  Independence Report):
  - SPA (`src/`) → Dispatch: NONE
  - Dispatch (`services|packages|db`) → SPA: NONE
  - Dispatch → Polished Pages Supabase project / Lovable gateway / edge
    functions: NONE

---

## Regression safety — full Sprint-1 suite still green (on the changed code)

Run on real Postgres 16 with the running API (dispatch_app role, RLS forced):
```
DDM schema fixture gate ............... 25/25 PASS
Sprint 1 E2E backbone ................. 13/13 PASS
Sprint 1 retry / DLQ framework ........  3/3  PASS
```
No Sprint-1 behavior changed; R2 additions are backward-compatible (svc + dev
tokens still resolve in non-production).

## Constraints honored

- Sprint 2 not started; Dispatch Engine not implemented; PDF not implemented;
  DOCX not implemented; worker render seam still the ADR-007 §5 stub.
- Commit local only; not pushed; `c37fa85` not created or pushed.

## Verification gaps (honest)

- Edge-function/Deno paths and live Supabase are not exercised (no Deno; the SPA
  Supabase project is out of scope for Dispatch).
- No Docker daemon in this environment: Dockerfiles and `docker-compose.yml` are
  validated by `docker compose config` only — **no image was built or run here.**
  The API, worker, and migrations were verified **natively** instead (real
  Postgres 16). First container build is deferred to a Docker host / CI runner.
- Service-secret at-rest hashing remains sha256 (argon2 residual — R-S1-1).
