# ADR-007 — Sprint 1 Implementation Decisions

- Status: Accepted
- Date: 2026-05-29
- Context: decisions made while implementing the Sprint 1 backbone (M1–M7).

## 1. Package namespace `@dispatch/*`
Sprint 0 scaffolded `@sovereign-dispatch/*`; the Sprint 1 brief specified
`@dispatch/ddm-schema` and `@dispatch/contract`. **Decision:** adopt `@dispatch/*`
as the canonical namespace. Directory paths unchanged; only `package.json` `name`
fields updated. The frozen schema files and `$id` URLs are unchanged.

## 2. SECURITY DEFINER for pre-tenant / cross-tenant operations
Two operations cannot run under tenant-scoped RLS because the tenant is unknown
or spans tenants:

- `dispatch.lookup_service_client(client_id)` — service-token auth must resolve a
  client *before* the tenant is known.
- `dispatch.claim_next_job(worker)` — the queue is cross-tenant; the atomic
  `FOR UPDATE SKIP LOCKED` claim spans all tenants.

**Decision:** implement both as `SECURITY DEFINER` functions, owned by a
superuser, `search_path` pinned, minimal surface (read-only lookup; single-row
claim+lease). All *subsequent* per-job work runs under the claimed job's tenant
claim with normal RLS. This preserves "no blanket bypass": exactly two narrow,
audited definer functions, everything else tenant-scoped.

## 3. DB roles `dispatch_app` / `dispatch_purge`
The API and worker connect as `dispatch_app` (nosuperuser) so RLS genuinely
applies to application queries. `dispatch_purge` is reserved for retention
(bypasses immutability triggers via a `current_user` check) and is unused in
Sprint 1.

## 4. Auth shim (Sprint 1 only)
`auth.mjs` accepts `svc <client_id>:<secret>` and `user <tenantId>:<role>` tokens
and compares a **sha256** of the service secret against `service_clients.secret_hash`.
This is a development harness, NOT production auth. Production replaces it with
verified JWTs (Supabase user tokens + Dispatch-minted service tokens) and
argon2/bcrypt secret hashing, behind the same `Principal` resolver (ADR-002).
Recorded as a risk (see risk register R-S1-1).

## 5. Worker render seam is an explicit stub
`processJob()` performs NO rendering in Sprint 1 — it transitions status and
writes audit, with an empty artifacts result. The seam is clearly marked for
Sprint 2 (Dispatch Engine + PDF/DOCX renderers). This is in-scope per the Sprint
1 brief ("No rendering required").

## 6. Test location
E2E/retry tests live under `services/test/` so Node ESM resolves the `pg` and
`@dispatch/*` dependencies from `services/node_modules`. (ESM ignores NODE_PATH.)
