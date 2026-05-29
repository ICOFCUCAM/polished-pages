# Sovereign Dispatch — Risk Register

Living register. Phase-1 program risks (from Epic 10), implementation risks
discovered during Sprint 1, and the autonomy work items (ADR-009, R1–R6).
Severity: Critical / Medium / Low / Accepted.

> 2026-05-29 update: the autonomy work (ADR-009) closed/downgraded several
> Sprint-1 risks. See "Autonomy work (ADR-009)" below and `docs/reports/`.

## Carried from Phase 1 planning (Epic 10)
| ID | Risk | Severity | Status |
|----|------|----------|--------|
| R-P1-1 | Tenant isolation correctness (RLS/bypass) | Critical | **Mitigated (Sprint 1)** — RLS forced on all 10 tables; SPK-B + E2E prove cross-tenant denial, no-claim-deny, user≡service parity. Two narrow SECURITY DEFINER fns reviewed (ADR-007). |
| R-P1-2 | PDF render reliability/determinism at load | Critical | Open — SPK-A proved feasibility; renderer is Sprint 2. |
| R-P1-3 | Security: SSRF/injection/Chromium sandbox | Critical | Open — renderer not yet built; gate before prod. |
| R-P1-4 | Integrity & durability (re-derive) | Critical | Partial — immutability + checksums in schema; artifact lifecycle is Sprint 2/Epic 8. |
| R-P1-5 | Secret management (no leaked service secrets) | Critical | Open — see R-S1-1. |

## New (Sprint 1 implementation)
| ID | Risk | Severity | Detail / planned mitigation |
|----|------|----------|------------------------------|
| R-S1-1 | **Auth is a dev shim** | ~~Critical~~ **Medium** | **Largely mitigated by R2 (ADR-009).** HS256 JWT verification is now the production path (`jwt.mjs` + `auth.mjs`) with client-credentials `POST /v1/token`; the `user` trust shim is disabled under `NODE_ENV=production`; secret compare is now constant-time. **Residual:** service-secret at-rest hashing is still sha256 — migrate to argon2/bcrypt before exposing to untrusted clients. |
| R-S1-2 | SECURITY DEFINER surface | Medium | Two definer fns (`lookup_service_client`, `claim_next_job`) bypass RLS by design. Mitigation: minimal/read-or-single-row, pinned search_path, owned by superuser, covered by tests. Re-review at security gate. |
| R-S1-3 | Worker claim not yet load-tested | Medium | SKIP LOCKED claim proven functionally (single worker). Multi-worker concurrency/no-double-process + poison-loop under load = Epic 10 load/kill tests (Sprint 2+). |
| R-S1-4 | Callback delivery best-effort | Medium | Sprint 1 signs (HMAC) + audits attempt but does not yet implement the 5× retry loop or per-service-client secret resolution (uses env shim). Full retry/secret-ref = Sprint 2. |
| R-S1-5 | No tenant fairness in queue | Medium | FIFO-within-lane; a noisy tenant can monopolize. Per-tenant concurrency cap deferred (Epic 4 noted). Monitor queue depth per tenant. |
| R-S1-6 | Local Postgres ≠ Supabase | Low | **Re-scoped by R3 (ADR-009):** Dispatch targets its **own** Postgres via `DISPATCH_*`/`PG*` config, not the Polished Pages Supabase project. Runner + backbone verified on Postgres 16. The Supabase access-token-hook claim source is the only delta if a Supabase-hosted DB is chosen. |
| R-S1-7 | Monorepo not yet unified | Low | **Mitigated by R6 (ADR-009):** the missing `services/*` workspace manifests are added; the Dispatch tree installs standalone (deps resolve; tests green). **Residual:** Dispatch still shares the `polished-pages` git repo (separate branch); a physical repo split is the recommended follow-up. |

## Autonomy work (ADR-009) — R1–R6

Executed so Polished Pages can be archived with zero impact on Sovereign
Dispatch / Emergency AI / Veritas. Verified on Postgres 16 + Node against the
changed code (see `docs/reports/AUTONOMY-VERIFICATION-REPORT.md`); committed
locally, not pushed.

| ID | Item | Status | Evidence / residual |
|----|------|--------|---------------------|
| R1 | Migration runner | **Done** | `db/migrate.mjs` + manifest; apply 5/5, idempotent, drift→exit 3; schema = 10 tables RLS-forced, 17 policies, 31 indexes. |
| R2 | Production authentication | **Done (residual)** | HS256 verify (7/7 unit incl. alg=none); `/v1/token`→Bearer→200; bad/tampered/no-auth→401. Residual: argon2 at-rest (R-S1-1). |
| R3 | Dedicated Dispatch infrastructure | **Done** | `services/.env.example` + `docker-compose.yml` (own Postgres); `docker compose config` valid. |
| R4 | Independent containerization | **Done (unbuilt)** | 3 Dockerfiles + `.dockerignore`. Config validated; **images NOT built/run — no Docker daemon in this environment.** First build occurs in CI / on a Docker host. |
| R5 | Independent CI/CD | **Done** | `.github/workflows/dispatch-ci.yml` path-scoped; YAML valid; mirrors the natively-reproduced green run. |
| R6 | Cleanup / severance | **Done (residual)** | Workspace manifests added; SPA↔Dispatch coupling = 0 both directions. Residual: physical repo split (R-S1-7). |

### New autonomy-era risks
| ID | Risk | Severity | Detail / mitigation |
|----|------|----------|---------------------|
| R-A9-1 | Shared git repo with the archived SPA | Low | Logical severance complete (zero cross-imports); archiving the SPA branch is safe. A physical repo split removes the cosmetic coupling — recommended follow-up. |
| R-A9-2 | Dev tokens reaching production | Low | Auto-disabled when `NODE_ENV=production`; force-off via `DISPATCH_ALLOW_DEV_TOKENS=0`. Ensure production sets `NODE_ENV`. |
| R-A9-3 | Container images unbuilt here | Low | No Docker daemon in this environment; Dockerfiles/compose validated by config only. First real build happens in CI / on a Docker host before deploy. |

## Accepted (Phase 1 scope)
PPTX/packaging (Phase 3); classification/clearance/legal-hold enforcement inert
(Phase 4); Veritas integration (Phase 3); Sovereign OIDC (post-P1); single-region
residency (Phase 4); reviewer/approver sign-off inert (Phase 4); Dispatch Engine
+ renderers (Sprint 2).
