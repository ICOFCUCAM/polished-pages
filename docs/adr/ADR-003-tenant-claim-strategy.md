# ADR-003 — Tenant Claim Strategy

- Status: Accepted
- Date: 2026-05-29
- Closes blocker: B3

## Context

RLS is specified as `tenant_id = current_tenant()` sourced from a JWT claim, but
the claim-injection path was undefined for both Supabase-Auth users and service
tokens. Without this, no RLS policy is writeable or testable.

## Options considered

1. Supabase custom access-token (auth) hook injects `tenant_id`/`role`/`clearance`
   into the user JWT; service tokens carry the same claims natively; Postgres
   helper functions read `auth.jwt()`.
2. App-layer tenant enforcement only (no RLS; API filters by tenant).
3. Schema-per-tenant isolation.

## Decision

**Option 1.** A Supabase custom access-token hook embeds `tenant_id`, `org_id`,
`dispatch_role`, `clearance`, `principal_type` into user JWTs at issuance,
driven by `memberships`. Service tokens are minted with the same claims.
Postgres helper functions:

- `current_tenant()  -> nullif(auth.jwt() ->> 'tenant_id','')::uuid`
- `current_role()    -> auth.jwt() ->> 'dispatch_role'`
- `current_clearance() -> auth.jwt() ->> 'clearance'`  (inert P1)

Every table enforces `USING (tenant_id = current_tenant())` for read; writes add
role checks. **A NULL/absent tenant claim must DENY (never match-all).**
`audit_events` is insert-only.

## Advantages

- DB-enforced isolation (defense-in-depth even if the API has a bug).
- Single claim source for both principal types; minimal app-layer trust.

## Disadvantages

- Multi-tenant users need a tenant-selection step that re-mints the token with
  the active `tenant_id`.
- Adds an issuance-time hook dependency.

## Risks & mitigations

- Misconfigured hook → missing claim. Policies must treat NULL as DENY; the
  SPK-B spike proves the no-claim-denies path and user≡service parity.

## Future migration path

With OIDC (ADR-002 future), the IdP populates the same claims; helper functions
and policies are unchanged. Schema-per-tenant remains available for a future
high-isolation gov deployment without changing app tenant semantics.

## Sprint 0 evidence

SPK-B runs a real Postgres with RLS policies and proves the full isolation
matrix, including NULL-claim denial and user≡service parity. See
`spikes/spk-b-rls/`.
