-- SPK-B: Tenant isolation / RLS spike (ADR-003).
-- Proves: cross-tenant denied, role-gated writes, NULL-claim DENIES (not allow-all),
-- user == service parity, audit append-only.
--
-- Claim source: in Supabase the access-token hook injects tenant_id/role into the
-- JWT; RLS reads auth.jwt(). Here we emulate that with a request-scoped GUC
-- `request.jwt.claims` (the same mechanism Supabase/PostgREST uses), so the
-- policies are written exactly as they will be in production.

-- ---- claim helpers (mirror production current_tenant()/current_role()) ----
create schema if not exists dispatch;

-- Robust against a missing/empty claims GUC: an absent hook must yield NULL
-- (which RLS predicates treat as DENY), never an error or an allow-all.
create or replace function dispatch.current_tenant() returns uuid
language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'tenant_id', '')::uuid
$$;

create or replace function dispatch.current_role() returns text
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true), '')::json ->> 'dispatch_role'
$$;

-- ---- tables ----
drop table if exists documents cascade;
drop table if exists audit_events cascade;

create table documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  title text not null default '',
  created_at timestamptz not null default now()
);

create table audit_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null,
  actor text not null,
  action text not null,
  ts timestamptz not null default now()
);

alter table documents enable row level security;
alter table documents force row level security;
alter table audit_events enable row level security;
alter table audit_events force row level security;

-- ---- policies ----
-- READ: tenant must match; NULL claim -> current_tenant() is null -> predicate false -> DENY.
create policy doc_read on documents for select
  using (dispatch.current_tenant() is not null and tenant_id = dispatch.current_tenant());

-- INSERT: author or tenant_admin, own tenant only.
create policy doc_insert on documents for insert
  with check (
    dispatch.current_tenant() is not null
    and tenant_id = dispatch.current_tenant()
    and dispatch.current_role() in ('author','tenant_admin','service')
  );

-- UPDATE: author/tenant_admin own tenant.
create policy doc_update on documents for update
  using (tenant_id = dispatch.current_tenant() and dispatch.current_role() in ('author','tenant_admin'))
  with check (tenant_id = dispatch.current_tenant());

-- No DELETE policy -> deletes denied for everyone (immutability posture).

-- audit_events: INSERT-only for any authenticated tenant principal; no select/update/delete.
create policy audit_insert on audit_events for insert
  with check (dispatch.current_tenant() is not null and tenant_id = dispatch.current_tenant());
-- (No select/update/delete policies -> those operations denied.)

-- ---- seed (as superuser, RLS bypassed for setup via a separate seeding role path) ----
-- We seed by temporarily disabling RLS as table owner.
alter table documents disable row level security;
insert into documents (id, tenant_id, title) values
  ('aaaaaaaa-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Tenant A doc'),
  ('bbbbbbbb-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'Tenant B doc');
alter table documents enable row level security;
