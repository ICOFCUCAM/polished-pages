-- M5 — Application DB roles & grants (Sprint 1)
-- dispatch_app : the API/worker runtime role (nosuperuser; RLS applies).
-- dispatch_purge: privileged retention role (bypasses immutability triggers); unused in Sprint 1.
-- In production these map to Supabase roles; here they make RLS genuinely enforced.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'dispatch_app') then
    create role dispatch_app nosuperuser login;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'dispatch_purge') then
    create role dispatch_purge nosuperuser login;
  end if;
end $$;

grant usage on schema dispatch to dispatch_app, dispatch_purge;
grant execute on all functions in schema dispatch to dispatch_app, dispatch_purge;

grant select, insert, update on
  dispatch.documents, dispatch.document_versions, dispatch.jobs, dispatch.job_dlq,
  dispatch.artifacts, dispatch.audit_events, dispatch.orgs, dispatch.memberships,
  dispatch.service_clients, dispatch.tenants
to dispatch_app;

-- delete is governed by RLS (no delete policies) — grant is harmless but we keep it tight:
grant delete on dispatch.documents to dispatch_app;  -- (still denied by absence of RLS delete policy)

-- purge role: can mutate immutable tables (retention), bypasses the block trigger via current_user check.
grant select, delete on dispatch.artifacts, dispatch.document_versions, dispatch.jobs to dispatch_purge;
