# ADR-009 — Dispatch Autonomy

- Status: Accepted
- Date: 2026-05-29
- Supersedes: none (extends ADR-001 runtime, ADR-002 auth)
- Context: Sovereign Dispatch was scaffolded **inside** the Polished Pages
  (Lovable) repository — sharing its git repo, its Supabase project
  (`uaoctiyghslkezowphtt`), its root build tooling, and its deployment surface.
  A decision has been taken that **Polished Pages may be archived**. Dispatch is
  the publication layer for the Sovereign ecosystem
  (`Sovereign → Emergency AI → Veritas → Sovereign Dispatch`) and must survive
  that archival with zero impact on Dispatch, Emergency AI, or Veritas
  Operations.

## Problem

Although Dispatch's *code* never imported the Polished Pages SPA, it inherited
several **host couplings** that would break if Polished Pages were archived:

1. **Schema lifecycle** — `db/migrations` had no runner of its own; the schema
   was provisioned through the host project's (Lovable/Supabase) tooling.
2. **Authentication** — the Sprint-1 `auth.mjs` was an explicit dev shim
   (ADR-007 §4, risk R-S1-1): it was the *only* auth path and was never meant
   for production.
3. **Infrastructure identity** — Dispatch had no configuration of its own; it
   implicitly leaned on the host's `.env` / Supabase project.
4. **Packaging** — the `services/*` workspace members had **no `package.json`**,
   so the Dispatch tree could not be installed or built independently.
5. **Build/release** — no CI or container images existed for Dispatch; any
   pipeline was the host's.

## Decision

Make Sovereign Dispatch **self-owning** along six axes (the R1–R6 autonomy
work items), so it can be built, migrated, authenticated, containerized, and
released with no reference to the Polished Pages host:

- **R1 — Migration runner.** Dispatch owns its schema lifecycle via
  `db/migrate.mjs` (psql-based, forward-only, checksum-tracked, idempotent,
  ordered by `db/migrations/manifest.json`).
- **R2 — Production authentication.** Real HS256 JWT verification
  (`services/shared/src/jwt.mjs`) behind the existing `Principal` resolver, plus
  a client-credentials `POST /v1/token` exchange. The dev trust shim is disabled
  under `NODE_ENV=production`. (ADR-002 realized; R-S1-1 downgraded.)
- **R3 — Dedicated infrastructure.** Dispatch-owned configuration
  (`services/.env.example`) and a self-contained stack (`docker-compose.yml`)
  running on **its own Postgres**, not the Polished Pages Supabase project.
- **R4 — Independent containerization.** Dockerfiles for api, worker, and the
  migration runner. Build context is the repo root with a `.dockerignore` that
  excludes the SPA entirely.
- **R5 — Independent CI/CD.** `.github/workflows/dispatch-ci.yml`, path-scoped to
  `services/** packages/** db/**`, standing up Postgres → migrate → schema gate →
  API → backbone tests. It never builds the SPA and the SPA's pipeline never
  builds it.
- **R6 — Cleanup / severance.** The missing workspace manifests are added so the
  Dispatch tree installs standalone; cross-dependency between the SPA and
  Dispatch is verified to be **zero in both directions**.

This work deliberately **excludes** Sprint 2 (Dispatch Engine, PDF/DOCX
renderers). The worker render seam (ADR-007 §5) remains an explicit stub.

## Advantages

- Polished Pages can be archived without affecting Dispatch / Emergency AI /
  Veritas — the success condition.
- Dispatch gains a real, testable provisioning + auth + release story.
- Each capability is verifiable on commodity infra (Postgres + Node + Docker),
  with no proprietary host dependency.

## Disadvantages

- Two parallel histories continue to live in one git repository (the SPA and
  Dispatch on separate branches). Physically splitting the repo is a larger move
  left to a follow-up.
- Service secret hashing remains sha256-at-rest (argon2/bcrypt is residual —
  see risk register R-S1-1 / R2 note); the *comparison* is now constant-time and
  request auth is JWT-verified.

## Risks & mitigations

- **Drifted/edited applied migration** → runner refuses on checksum drift
  (forward-only immutability).
- **Dev tokens reaching production** → auto-disabled when `NODE_ENV=production`;
  force-off via `DISPATCH_ALLOW_DEV_TOKENS=0`.
- **Symlinked-workspace dep resolution** (ajv resolving from the package's real
  path) → each Dispatch package owns its dependencies; verified by resolution
  check and a green container build.

## Future migration path

1. Extract Dispatch into its own repository (the branches already isolate it).
2. Replace HS256 verification with **Sovereign OIDC** (ADR-002 future path) —
   issuer-level swap behind the same `Principal` resolver.
3. Migrate service-secret at-rest hashing to argon2/bcrypt.
4. Sprint 2 plugs the Dispatch Engine + renderers into the existing worker seam
   with no backbone changes.

## Evidence

Recorded in `docs/reports/AUTONOMY-VERIFICATION-REPORT.md` (and the Independence
/ Infrastructure-Ownership reports). Summary: migration runner applies 5/5 and
detects drift; 13 E2E + 3 retry + 25 schema-fixture tests pass on real Postgres
16 against the changed code; the production JWT path is exercised end-to-end
(token exchange → Bearer → 200; bad-secret/tampered/no-auth → 401); CI and
compose YAML validate (`docker compose config` passes; images are not built here —
no Docker daemon in this environment — and are first built in CI / on a Docker
host); SPA↔Dispatch coupling is zero in both directions.
