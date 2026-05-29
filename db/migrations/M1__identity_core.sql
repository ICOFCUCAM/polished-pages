-- M1 — Identity core (Epic 2 §2.1–2.4)
-- tenants, orgs, memberships (user principals), service_clients (machine principals).
-- Seeds a default "workspace" tenant for future legacy backfill (M6, not in Sprint 1).

create schema if not exists dispatch;

-- ---- claim helpers (ADR-003 / SPK-B): read JWT claims from request.jwt.claims GUC.
-- Hardened so a missing/empty claim yields NULL -> RLS DENY (never allow-all).
create or replace function dispatch.current_tenant() returns uuid
language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'tenant_id', '')::uuid
$$;

create or replace function dispatch.current_role() returns text
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true), '')::json ->> 'dispatch_role'
$$;

create or replace function dispatch.current_principal() returns text
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'principal_type', 'unknown')
$$;

create or replace function dispatch.current_actor() returns text
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'actor', dispatch.current_principal())
$$;

-- ---- tenants ----
create table dispatch.tenants (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  status        text not null default 'active' check (status in ('active','suspended')),
  edition       text not null default 'standard' check (edition in ('standard','government','enterprise')),
  residency     text not null default 'default',
  retention_days int not null default 365,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table dispatch.orgs (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references dispatch.tenants(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

-- ---- memberships (human principals; user_id is a soft ref to auth.users) ----
create table dispatch.memberships (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references dispatch.tenants(id) on delete cascade,
  org_id     uuid references dispatch.orgs(id) on delete set null,
  user_id    uuid not null,
  role       text not null default 'viewer'
             check (role in ('viewer','author','reviewer','approver','template_admin','tenant_admin')),
  clearance  text not null default 'none',   -- inert P1
  status     text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

-- ---- service_clients (machine principals; e.g. Emergency AI) ----
create table dispatch.service_clients (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references dispatch.tenants(id) on delete cascade,
  name                text not null,
  client_id           text unique not null,
  secret_hash         text not null,                 -- argon2/bcrypt; never raw
  scopes              text[] not null default '{}',  -- dispatch:validate|render|read
  clearance           text not null default 'none',  -- inert P1
  callback_secret_ref text,                          -- pointer to secrets mgr (HMAC); never raw
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  last_used_at        timestamptz
);

create index on dispatch.memberships (user_id);
create index on dispatch.service_clients (tenant_id, active);

-- Auth lookup must resolve a client BEFORE the tenant is known, so it cannot be
-- tenant-scoped. SECURITY DEFINER (owned by a superuser) bypasses RLS for this
-- single, read-only, by-client_id purpose only. Returns the minimum needed.
create or replace function dispatch.lookup_service_client(p_client_id text)
returns table (tenant_id uuid, secret_hash text, scopes text[], active boolean)
language sql security definer stable
set search_path = dispatch as $$
  select tenant_id, secret_hash, scopes, active
    from dispatch.service_clients where client_id = p_client_id
$$;

-- ---- seed default workspace tenant (for M6 legacy backfill, later) ----
insert into dispatch.tenants (id, slug, name)
values ('00000000-0000-4000-8000-0000000000ff', 'workspace', 'Default Workspace')
on conflict (slug) do nothing;
