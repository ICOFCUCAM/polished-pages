# Sprint 1 — Completion Report

- Status: **COMPLETE** — all success criteria met; 16/16 tests pass on real Postgres + live API + real worker.
- Date: 2026-05-29
- Branch: `claude/pensive-hawking-6OjUP`
- Scope: M1–M7 operational backbone. **No rendering** (Sprint 2). Committed locally; **not pushed**.

---

## Target outcome — ACHIEVED
A valid Executive Briefing request completes the full backbone with no rendering:
```
Dispatch Contract → Validation → Document + Version → Job → Worker Claim
→ Status Progression (queued→running→succeeded) → Audit Trail
```
Proven end-to-end against a real database, live HTTP API, and a real worker
(`services/test/EVIDENCE.txt`).

## 1. Migration list (db/migrations/, applied in this order)
| # | File | Contents |
|---|------|----------|
| M1 | `M1__identity_core.sql` | tenants, orgs, memberships, service_clients; claim helpers; `lookup_service_client` (SECURITY DEFINER); default workspace tenant |
| M3 | `M3__documents.sql` | documents, document_versions (immutable trigger), updated_at trigger |
| M4 | `M4__jobs_artifacts_audit.sql` | jobs, job_dlq, artifacts, audit_events (append-only trigger); `claim_next_job` (SECURITY DEFINER); queue/indexes |
| M2 | `M2__rls_policies.sql` | RLS enable+force + policies on all 10 tables (NULL claim → DENY) |
| M5 | `M5__roles_grants.sql` | `dispatch_app` / `dispatch_purge` roles + grants |

(Applied M1→M3→M4→M2→M5 so policies/grants follow table creation. Seed:
`db/seed/sprint1_seed.sql`.)

## 2. Files created
**DB (6):** 5 migrations + 1 seed.
**Shared (2):** `services/shared/src/db.mjs` (RLS-claim transaction wrapper, audit
writer), `services/shared/src/auth.mjs` (`Principal` resolver — service + dev-user).
**API (1):** `services/dispatch-api/src/server.mjs` — `POST /v1/validate`,
`POST /v1/documents`, `/v1/health`.
**Worker (1):** `services/dispatch-worker/src/worker.mjs` — claim/lease, status
transitions, retry+backoff, DLQ, callback framework, **render stub**.
**Tests (2 + evidence):** `services/test/sprint1-e2e.mjs`,
`services/test/sprint1-retry.mjs`, `services/test/EVIDENCE.txt`.
**Workspace (1):** `services/package.json`.
**Docs (3):** ADR-007, this report, `docs/RISK-REGISTER.md`.
**Packages:** `@dispatch/ddm-schema`, `@dispatch/contract` (renamed from Sprint 0).

## 3. Modules delivered
- **M1 Database layer** — all 8 required tables (+ orgs, job_dlq) created & verified.
- **M2 RLS** — exactly as validated in SPK-B, extended to all tables; no-claim-deny + tenant isolation preserved; immutable/append-only via triggers.
- **M3 Shared packages** — `@dispatch/ddm-schema` (validator + frozen schema), `@dispatch/contract`.
- **M4 Validation service** — DDM + contract + scaffold + cross-reference validation via the single shared module (API ≡ worker parity).
- **M5 API** — `/v1/validate` (200 valid/invalid verdicts), `/v1/documents` (202 + job; idempotency; tenant guard; scope/role auth).
- **M6 Persistence** — documents, immutable versions, jobs, append-only audit all persisted within RLS transactions.
- **M7 Worker skeleton** — SKIP LOCKED claim + lease, queued→running→succeeded/failed transitions, retry+exponential backoff, DLQ on exhaustion, HMAC-signed callback framework.

## 4. Tests executed (16/16 PASS)
**E2E backbone (13):** valid validate; invalid validate (SCAFFOLD_INCOMPLETE);
submit→202+job; document.submitted audit; idempotent replay; missing idem-key→400;
tenant mismatch→403; bad secret→401; worker claim (SKIP LOCKED); status
progression→succeeded@100; render.succeeded audit; document_versions immutable;
cross-tenant isolation.
**Retry/DLQ (3):** transient fail → requeue (att1→att2) → exhaust (att3) → failed;
DLQ row with replay payload; render.failed audit.

Evidence: `services/test/EVIDENCE.txt` (full run output).

## 5. Architecture decisions made
Recorded in **ADR-007**: `@dispatch/*` namespace; two narrow SECURITY DEFINER
functions for pre-tenant/cross-tenant ops (auth lookup, queue claim); `dispatch_app`/
`dispatch_purge` DB roles; Sprint-1 auth shim (to be replaced); explicit render
stub; test location.

## 6. Out of scope (NOT implemented — per brief)
PDF renderer · DOCX renderer · Dispatch Engine · UI · Packaging · Workspace Tools
· Veritas integration. Worker render seam is a clearly-marked stub.

## 7. Risk register updates
See `docs/RISK-REGISTER.md`. Notable: **R-P1-1 tenant isolation → Mitigated**
(RLS forced + proven). New criticals/mediums logged: **R-S1-1 auth is a dev shim
(must replace before prod)**, R-S1-2 definer surface, R-S1-3 claim not load-tested,
R-S1-4 callback retry not yet implemented, R-S1-5 queue fairness.

## 8. Environment / reproduction
- Real Postgres 16 (local cluster, port 55432); API + worker run as `dispatch_app`
  (RLS forced) → isolation is genuinely enforced, not simulated.
- Rebuild: `create db → psql M1,M3,M4,M2,M5 → grant execute on definer fns → seed`.
- Run: start `dispatch-api/src/server.mjs`; `node services/test/sprint1-e2e.mjs`.

## 9. Status
Sprint 1 complete; committed locally; **not pushed**. Sprint 2 not started
(renderers/engine/UI excluded). Awaiting review.
