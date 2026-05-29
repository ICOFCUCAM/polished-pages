# ADR-002 — Authentication Model

- Status: Accepted
- Date: 2026-05-29
- Closes blocker: B2

## Context

The contract assumes Sovereign OIDC + OAuth2 client-credentials for machine
callers (Emergency AI). Reality: Supabase Auth exists but is unused; no Sovereign
IdP integration target is confirmed. Two principal types exist: **users** (SaaS
UI) and **services** (Emergency AI, machine-to-machine).

## Options considered

1. Supabase Auth for users + a custom Dispatch-issued service-token system for
   machines.
2. Stand up full OIDC now (Sovereign or third-party such as Auth0/Keycloak) for
   both.
3. Static API keys for services; Supabase Auth for users.

## Decision

**Option 1.** Users authenticate via **Supabase Auth**. Machines use
**Dispatch-issued service tokens** — short-lived JWTs minted from a
`service_clients` record (client_id + secret, client-credentials style), signed
with a key both the API and Postgres trust, carrying `tenant_id`, `scopes`, and
(inert) `clearance`. All auth is abstracted behind a `Principal` resolver so an
external OIDC IdP can replace either path later without touching RLS or handlers.

Token shape (uniform across both principal types) carries:
`tenant_id`, `principal_type` (`user`|`service`), `dispatch_role` / `scopes`,
`clearance` (inert P1), and (service) `client_id`.

## Advantages

- No new IdP dependency for Phase 1; native to the current stack.
- Real client-credentials semantics for Emergency AI.
- One claim shape for both principal types → a single uniform RLS path.

## Disadvantages

- We implement service-token minting/rotation ourselves.
- Two issuance paths to maintain; not yet "real" OIDC.

## Risks & mitigations

- Home-grown token handling → use a standard JWT library, short TTL, instant
  revoke via `service_clients.active=false`, signing key in a secrets manager
  with rotatable `kid`.

## Future migration path

Replace the service-token minter and Supabase Auth with **Sovereign OIDC**
(client-credentials + auth-code) when it exists. Because everything downstream
consumes JWT claims via the `Principal` resolver, the swap is issuer-level; RLS
predicates and handlers are unchanged.
