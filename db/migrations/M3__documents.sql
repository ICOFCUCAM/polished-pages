-- M3 — Documents (Epic 2 §2.5–2.6)
-- documents + immutable document_versions (the DDM payload lives here, validated
-- by the app before insert). Immutability enforced by trigger + (in M7) RLS.

create table dispatch.documents (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references dispatch.tenants(id) on delete cascade,
  org_id          uuid references dispatch.orgs(id) on delete set null,
  doc_type        text not null,
  title           text not null default '',
  classification  jsonb not null default '{}',
  status          text not null default 'draft'
                  check (status in ('draft','rendering','complete','failed')),
  current_version int not null default 0,
  owner_user_id   uuid,
  source_system   text not null default 'saas-ui'
                  check (source_system in ('emergency-ai','saas-ui','internal')),
  correlation_id  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create table dispatch.document_versions (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references dispatch.tenants(id) on delete cascade,
  document_id      uuid not null references dispatch.documents(id) on delete cascade,
  version_no       int not null,
  ddm              jsonb not null,              -- validated DDM payload
  ddm_version      text not null,
  template_id      text,
  template_version int,
  engine_version   text,
  created_by       uuid,
  created_at       timestamptz not null default now(),
  unique (document_id, version_no)
);

create index on dispatch.documents (tenant_id, status);
create index on dispatch.documents (tenant_id, created_at desc);
create index on dispatch.documents (tenant_id, correlation_id);
create index on dispatch.document_versions (tenant_id, document_id);
create index on dispatch.document_versions using gin (ddm jsonb_path_ops);

-- Immutability: block UPDATE/DELETE on document_versions for everyone except a
-- named purge role (retention, later). Defense-in-depth alongside RLS (M7).
create or replace function dispatch.block_mutation() returns trigger
language plpgsql as $$
begin
  if current_user <> 'dispatch_purge' then
    raise exception 'immutable row: % on % is not permitted', tg_op, tg_table_name;
  end if;
  return null;
end $$;

create trigger document_versions_immutable
  before update or delete on dispatch.document_versions
  for each row execute function dispatch.block_mutation();

-- updated_at maintenance on documents
create or replace function dispatch.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create trigger documents_touch before update on dispatch.documents
  for each row execute function dispatch.touch_updated_at();
