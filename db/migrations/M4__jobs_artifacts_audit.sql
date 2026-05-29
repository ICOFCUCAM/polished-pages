-- M4 — Async jobs, artifacts, append-only audit (Epic 2 §2.7–2.10)

create table dispatch.jobs (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references dispatch.tenants(id) on delete cascade,
  document_id      uuid references dispatch.documents(id) on delete set null,
  version_id       uuid references dispatch.document_versions(id) on delete set null,
  request_id       uuid not null,
  idempotency_key  uuid not null,
  type             text not null default 'render' check (type in ('render')),
  lane             text not null default 'service' check (lane in ('interactive','service')),
  state            text not null default 'queued'
                   check (state in ('queued','running','succeeded','failed','partial')),
  outputs          text[] not null,
  progress         int not null default 0,
  attempts         int not null default 0,
  max_attempts     int not null default 3,
  correlation_id   text,
  callback_url     text,
  result           jsonb,
  error            jsonb,
  next_visible_at  timestamptz not null default now(),  -- backoff gating
  locked_at        timestamptz,
  locked_by        text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);

create table dispatch.job_dlq (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references dispatch.tenants(id) on delete cascade,
  job_id     uuid not null,
  reason     text not null,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);

create table dispatch.artifacts (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references dispatch.tenants(id) on delete cascade,
  version_id      uuid not null references dispatch.document_versions(id) on delete cascade,
  job_id          uuid references dispatch.jobs(id) on delete set null,
  role            text not null default 'primary' check (role in ('primary')),
  format          text not null check (format in ('pdf','docx','md')),
  storage_ref     text not null,
  sha256          text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  size_bytes      bigint not null,
  pages           int,
  classification  text,
  integrity_status text not null default 'ok' check (integrity_status in ('ok','suspect','unrecoverable')),
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  unique (version_id, format, role)
);

create table dispatch.audit_events (
  id             bigint generated always as identity primary key,
  event_id       uuid not null default gen_random_uuid(),
  tenant_id      uuid not null references dispatch.tenants(id) on delete cascade,
  actor          text not null,
  actor_type     text not null check (actor_type in ('user','service','system')),
  action         text not null,
  target_type    text,
  target_id      uuid,
  classification text,
  request_id     uuid,
  correlation_id text,
  sha256         text,
  prev_hash      text,
  row_hash       text,
  ts             timestamptz not null default now()
);

-- queue dequeue index (partial, matches the SKIP LOCKED claim query)
create index jobs_queued_idx on dispatch.jobs (lane, created_at) where state = 'queued';
create index on dispatch.jobs (tenant_id, state);
create index on dispatch.jobs (document_id);
create index on dispatch.artifacts (tenant_id);
create index on dispatch.artifacts (expires_at) where expires_at is not null;
create index on dispatch.audit_events (tenant_id, ts desc);
create index on dispatch.audit_events (tenant_id, target_type, target_id);

create trigger jobs_touch before update on dispatch.jobs
  for each row execute function dispatch.touch_updated_at();

-- Worker claim is a CROSS-TENANT system operation (the queue spans tenants), so it
-- cannot run under tenant-scoped RLS. SECURITY DEFINER performs the atomic
-- FOR UPDATE SKIP LOCKED claim and lease; all subsequent per-job work uses the
-- claimed job's tenant_id under normal RLS (Epic 4 design).
create or replace function dispatch.claim_next_job(p_worker text)
returns dispatch.jobs
language plpgsql security definer
set search_path = dispatch as $$
declare j dispatch.jobs;
begin
  with next as (
    select id from dispatch.jobs
     where state='queued' and next_visible_at <= now()
       and (locked_at is null or locked_at < now() - interval '5 minutes')
     order by (lane='interactive') desc, created_at asc
     for update skip locked
     limit 1
  )
  update dispatch.jobs jb
     set state='running', locked_at=now(), locked_by=p_worker, attempts=attempts+1, progress=10, updated_at=now()
    from next where jb.id = next.id
  returning jb.* into j;
  return j;  -- null if no row claimed
end $$;

-- audit_events is append-only: block UPDATE/DELETE for everyone.
create trigger audit_events_append_only
  before update or delete on dispatch.audit_events
  for each row execute function dispatch.block_mutation();
