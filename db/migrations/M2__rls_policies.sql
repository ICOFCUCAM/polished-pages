-- M2 — Row-Level Security (Epic 2 §4; validated in SPK-B)
-- Applied AFTER M1/M3/M4 tables exist. Cardinal rule: NULL tenant claim => DENY.
-- Reads: tenant must match. Writes: tenant match + role gate. Immutable/append-only
-- tables have no UPDATE/DELETE policy (and triggers block privileged mutation too).

-- Enable + force RLS on every domain table (force => owner is not exempt).
do $$
declare t text;
begin
  foreach t in array array[
    'tenants','orgs','memberships','service_clients',
    'documents','document_versions','jobs','job_dlq','artifacts','audit_events'
  ] loop
    execute format('alter table dispatch.%I enable row level security;', t);
    execute format('alter table dispatch.%I force row level security;', t);
  end loop;
end $$;

-- ---- tenants: a principal may read its own tenant row ----
create policy tenants_read on dispatch.tenants for select
  using (dispatch.current_tenant() is not null and id = dispatch.current_tenant());

-- ---- generic per-tenant READ for tenant-scoped tables ----
create policy orgs_read         on dispatch.orgs            for select using (dispatch.current_tenant() is not null and tenant_id = dispatch.current_tenant());
create policy memberships_read  on dispatch.memberships     for select using (dispatch.current_tenant() is not null and tenant_id = dispatch.current_tenant());
create policy svc_read          on dispatch.service_clients for select using (dispatch.current_tenant() is not null and tenant_id = dispatch.current_tenant());
create policy documents_read    on dispatch.documents       for select using (dispatch.current_tenant() is not null and tenant_id = dispatch.current_tenant());
create policy versions_read     on dispatch.document_versions for select using (dispatch.current_tenant() is not null and tenant_id = dispatch.current_tenant());
create policy jobs_read         on dispatch.jobs            for select using (dispatch.current_tenant() is not null and tenant_id = dispatch.current_tenant());
create policy artifacts_read    on dispatch.artifacts       for select using (dispatch.current_tenant() is not null and tenant_id = dispatch.current_tenant());
-- audit_events: NO select policy in P1 (write-only from app principals; reads via admin/compliance path later).

-- ---- documents: author/tenant_admin write own tenant; service may create (machine path) ----
create policy documents_insert on dispatch.documents for insert
  with check (dispatch.current_tenant() is not null
              and tenant_id = dispatch.current_tenant()
              and dispatch.current_role() in ('author','tenant_admin','service'));
create policy documents_update on dispatch.documents for update
  using (tenant_id = dispatch.current_tenant() and dispatch.current_role() in ('author','tenant_admin','service'))
  with check (tenant_id = dispatch.current_tenant());
-- no documents delete policy => deletes denied (soft-delete via update only).

-- ---- document_versions: author/service insert own tenant; immutable thereafter ----
create policy versions_insert on dispatch.document_versions for insert
  with check (dispatch.current_tenant() is not null
              and tenant_id = dispatch.current_tenant()
              and dispatch.current_role() in ('author','tenant_admin','service'));
-- no update/delete policy (+ immutability trigger from M3).

-- ---- jobs: author/service create + transition own tenant ----
create policy jobs_insert on dispatch.jobs for insert
  with check (dispatch.current_tenant() is not null
              and tenant_id = dispatch.current_tenant()
              and dispatch.current_role() in ('author','tenant_admin','service'));
create policy jobs_update on dispatch.jobs for update
  using (tenant_id = dispatch.current_tenant() and dispatch.current_role() in ('author','tenant_admin','service'))
  with check (tenant_id = dispatch.current_tenant());
-- no jobs delete policy.

-- ---- artifacts: service-only insert (worker context); immutable ----
create policy artifacts_insert on dispatch.artifacts for insert
  with check (dispatch.current_tenant() is not null
              and tenant_id = dispatch.current_tenant()
              and dispatch.current_role() in ('service','tenant_admin'));
-- no update/delete policy (retention purge uses dispatch_purge role outside RLS).

-- ---- job_dlq: service insert/read own tenant ----
create policy dlq_read on dispatch.job_dlq for select
  using (dispatch.current_tenant() is not null and tenant_id = dispatch.current_tenant());
create policy dlq_insert on dispatch.job_dlq for insert
  with check (dispatch.current_tenant() is not null and tenant_id = dispatch.current_tenant()
              and dispatch.current_role() in ('service','tenant_admin'));

-- ---- audit_events: INSERT-only for any tenant principal; no select/update/delete ----
create policy audit_insert on dispatch.audit_events for insert
  with check (dispatch.current_tenant() is not null and tenant_id = dispatch.current_tenant());
-- (append-only trigger from M4 blocks update/delete even for privileged roles.)
