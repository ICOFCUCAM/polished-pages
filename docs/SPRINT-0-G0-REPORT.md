# Sprint 0 — G0 Gate Evidence Report

- Status: **G0 PASS** (all exit criteria met)
- Date: 2026-05-29
- Branch: `claude/pensive-hawking-6OjUP`
- Scope: Sprint 0 only. No Sprint 1 work performed. Not pushed.

Sprint 0 de-risks Phase 1 and freezes the contract. This report records the
evidence for each G0 exit criterion.

---

## 1. ADR repository — DONE
Six ADRs authored and marked **Accepted** in `docs/adr/`:

| ADR | Decision |
|-----|----------|
| 001 | Runtime: container service (Cloud Run/Fly) + worker w/ headless Chromium |
| 002 | Auth: Supabase Auth (users) + Dispatch service tokens (machines); `Principal` abstraction |
| 003 | Tenant claim: Supabase access-token hook → JWT claims → RLS; NULL = DENY |
| 004 | AI out of the engine path; render = DDM-in; AI only behind Workspace Tools |
| 005 | JSON Schema 2020-12 + Ajv as canonical contract; shared validator |
| 006 | DOCX via `docx` library behind `DocxRenderer`; retires legacy generators |

## 2. Contract frozen (Epic 1) — DONE
- `packages/ddm-schema/schemas/ddm.v1.0.json` — DDM v1 (`$id …/ddm/v1.0/document.json`)
- `packages/ddm-schema/schemas/scaffolds.v1.0.json` — exec_briefing / situation_report / policy_paper profiles
- `packages/contract/schemas/document-request.v1.0.json` — DocumentRequest v1
- `packages/contract/schemas/document-result.v1.0.json` — DocumentResult v1
- `packages/ddm-schema/src/validator.mjs` — the single shared validator (Ajv +
  post-validation passes: size limits, cross-ref resolution, cross-field,
  scaffold completeness). Used by `/validate`, `/documents`, and the worker.

### Gate: schema fixtures
```
$ npm run fixtures && npm run test     (packages/ddm-schema)
wrote 5 valid + 15 invalid fixtures
TOTAL: 25 passed, 0 failed
```
- 5 valid fixtures pass (+ 5 worker-parity checks on the inner DDM).
- 15 invalid fixtures fail with the exact expected primary error code
  (SCHEMA_INVALID / SCAFFOLD_INCOMPLETE / UNRESOLVED_REF / CALLBACK_URL_REQUIRED /
  DOC_TOO_LARGE), including the aggregate-block-budget DOC_TOO_LARGE case that
  exercises the post-validation pass beyond pure JSON Schema.

### 8 ambiguities — resolved & encoded
chart subset (fixed spec, additionalProperties:false) · object-only table cells ·
size limits (80 sec / 400 blocks / 2 MB …) · `section.order` added · callback HMAC
secret = per-service-client `callback_secret_ref` (never in payload) · signed-URL
policy (default 7d, 300s–30d, mint-on-read) · sync mode dropped (`mode: async`
const) · package null in P1.

## 3. SPK-A — Chromium HTML→PDF — PASS (closes B1)
Real headless Chromium renders an Executive-Briefing HTML to PDF.
Evidence: `spikes/spk-a-chromium/EVIDENCE.json`, `out-1.pdf` (delivered to user).

```
produces valid PDF .................. true
multi-page (cover+toc+body, 3 pp) ... true
non-empty artifact (≈110 KB) ........ true
deterministic (normalized) .......... true   (raw differs only by /CreationDate)
warm render ......................... ≈258 ms  (target <5 s)
```
Chrome furniture proven: cover page, OFFICIAL-SENSITIVE banners (top+bottom),
running header w/ reference code, "Page X of Y" footer, TOC, numbered sections,
table, recommendation callout. Timestamp-normalization determinism validates the
PDF/A reproducibility approach.

## 4. SPK-B — Tenant isolation / RLS — PASS (closes B2/B3)
Real Postgres 16, RLS forced, run as unprivileged `dispatch_app`.
Evidence: `spikes/spk-b-rls/EVIDENCE.txt`.

```
11 passed, 0 failed
- user A reads A: visible     - user A reads B: denied
- service A reads A: visible  - service A reads B: denied   (user≡service parity)
- no claim: denied (NOT allow-all)
- viewer write: denied        - author write own: allowed
- author write cross-tenant: denied
- audit insert: allowed       - audit update: denied (0 rows)
- document delete: denied (0 rows)
```
Claim source = `request.jwt.claims` GUC (the exact Supabase/PostgREST mechanism),
so policies are production-shaped. Helpers hardened so a missing/empty claim
yields NULL → DENY.

## 5. Monorepo structure — DONE (additive)
`docs/`, `packages/ddm-schema`, `packages/contract`, `spikes/` added. Existing SPA
**untouched** (`package.json` name still `vite_react_shadcn_ts`). Physical move to
`apps/web` + `services/*` deferred to Sprint 1 (see `docs/MONOREPO.md`).

---

## G0 exit criteria checklist
- [x] ADRs 001–006 accepted
- [x] DDM v1 + Contract v1 frozen as JSON Schema, published in `packages/`
- [x] Shared Ajv validator with post-validation passes; `/validate` ≡ worker parity proven
- [x] 5 valid + 15 invalid fixtures pass with expected codes
- [x] 8 ambiguities resolved and encoded
- [x] SPK-A green (valid PDF + checksum + determinism + metrics)
- [x] SPK-B green (full isolation matrix incl. no-claim-deny + user≡service parity)
- [x] Monorepo skeleton in place (additive); SPA preserved
- [x] Toolchain confirmed: Node 22, Postgres 16, headless Chromium present

## Environment note (reproduction)
- SPK-A used the in-image Chromium at `/opt/pw-browsers/chromium_headless_shell-1194`
  (Playwright CDN download is blocked by the network allowlist — irrelevant, a
  Chromium binary is present and works). The dispatch-worker container will ship
  its own pinned Chromium + embedded fonts per ADR-001.
- SPK-B used a locally-initialised Postgres 16 cluster on port 55432 (ephemeral).
  Production uses Supabase Postgres; the policies/helpers are identical.

## Decision
**G0 = PASS.** Sprint 0 blockers B1–B5 closed; contract frozen. Ready to request
approval for Sprint 1. **Stopping here per instruction — not proceeding to Sprint
1, not pushing.**
