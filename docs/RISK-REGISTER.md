# Sovereign Dispatch — Risk Register

Living register. Phase-1 program risks (from Epic 10) plus implementation risks
discovered during Sprint 1. Severity: Critical / Medium / Accepted.

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
| R-S1-1 | **Auth is a dev shim** | Critical (pre-prod) | `auth.mjs` uses plaintext-style `svc/user` tokens + sha256 secret compare. MUST be replaced before any non-local use with verified JWTs (Supabase user + Dispatch service tokens) and argon2/bcrypt hashing. Surface unchanged (`Principal`), so swap is isolated. |
| R-S1-2 | SECURITY DEFINER surface | Medium | Two definer fns (`lookup_service_client`, `claim_next_job`) bypass RLS by design. Mitigation: minimal/read-or-single-row, pinned search_path, owned by superuser, covered by tests. Re-review at security gate. |
| R-S1-3 | Worker claim not yet load-tested | Medium | SKIP LOCKED claim proven functionally (single worker). Multi-worker concurrency/no-double-process + poison-loop under load = Epic 10 load/kill tests (Sprint 2+). |
| R-S1-4 | Callback delivery best-effort | Medium | Sprint 1 signs (HMAC) + audits attempt but does not yet implement the 5× retry loop or per-service-client secret resolution (uses env shim). Full retry/secret-ref = Sprint 2. |
| R-S1-5 | No tenant fairness in queue | Medium | FIFO-within-lane; a noisy tenant can monopolize. Per-tenant concurrency cap deferred (Epic 4 noted). Monitor queue depth per tenant. |
| R-S1-6 | Local Postgres ≠ Supabase | Low | Policies/helpers written as production migrations; the access-token hook (vs GUC) is the only delta and is isolated to claim-source. Validate on Supabase in Sprint 2. |
| R-S1-7 | Monorepo not yet unified | Low | `services/*` and `packages/*` use a local workspace; SPA still at root (apps/web move deferred). No functional impact. |

## Accepted (Phase 1 scope)
PPTX/packaging (Phase 3); classification/clearance/legal-hold enforcement inert
(Phase 4); Veritas integration (Phase 3); Sovereign OIDC (post-P1); single-region
residency (Phase 4); reviewer/approver sign-off inert (Phase 4); Dispatch Engine
+ renderers (Sprint 2).
