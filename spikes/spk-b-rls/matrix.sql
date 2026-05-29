-- SPK-B test matrix. Each case sets a JWT-claims GUC (emulating the access-token
-- hook), runs an operation as a non-owner role, and reports PASS/FAIL.
-- Run against a non-superuser role so RLS is enforced (superusers bypass RLS).

\set ON_ERROR_STOP off
\pset pager off

-- Setup (as owner/superuser): helper fn + results table live in dispatch schema.
create or replace function dispatch.set_claims(tenant text, role text, ptype text default 'user') returns void
language plpgsql as $$
begin
  if tenant is null then
    perform set_config('request.jwt.claims', json_build_object('dispatch_role', role, 'principal_type', ptype)::text, true);
  else
    perform set_config('request.jwt.claims', json_build_object('tenant_id', tenant, 'dispatch_role', role, 'principal_type', ptype)::text, true);
  end if;
end $$;

drop table if exists dispatch.results;
create table dispatch.results (name text, expected text, actual text, pass boolean);
grant insert, select on dispatch.results to dispatch_app;
grant execute on function dispatch.set_claims(text,text,text) to dispatch_app;

-- Now run the test body as the unprivileged app role; RLS applies to documents/audit.
set role dispatch_app;

-- Case runner for SELECT visibility (counts rows visible for a given doc tenant)
do $$
declare
  A constant text := '11111111-1111-4111-8111-111111111111';
  B constant text := '22222222-2222-4222-8222-222222222222';
  n int;
  ok boolean;
begin
  -- 1. User in A reads A's doc -> visible (1)
  perform dispatch.set_claims(A, 'author');
  select count(*) into n from documents where tenant_id = A::uuid;
  insert into dispatch.results values ('user_A_reads_A', 'visible(>=1)', n::text, n >= 1);

  -- 2. User in A reads B's doc -> not visible (0)
  perform dispatch.set_claims(A, 'author');
  select count(*) into n from documents where tenant_id = B::uuid;
  insert into dispatch.results values ('user_A_reads_B', 'denied(0)', n::text, n = 0);

  -- 3. Service token in A reads A -> visible (parity with user)
  perform dispatch.set_claims(A, 'service', 'service');
  select count(*) into n from documents where tenant_id = A::uuid;
  insert into dispatch.results values ('service_A_reads_A', 'visible(>=1)', n::text, n >= 1);

  -- 4. Service token in A reads B -> denied
  perform dispatch.set_claims(A, 'service', 'service');
  select count(*) into n from documents where tenant_id = B::uuid;
  insert into dispatch.results values ('service_A_reads_B', 'denied(0)', n::text, n = 0);

  -- 5. NO claim -> denies all (NOT allow-all)
  perform set_config('request.jwt.claims', '', true);
  select count(*) into n from documents;
  insert into dispatch.results values ('no_claim_reads_all', 'denied(0)', n::text, n = 0);
end $$;

-- Write cases (INSERT) with exception capture
do $$
declare
  A constant text := '11111111-1111-4111-8111-111111111111';
  B constant text := '22222222-2222-4222-8222-222222222222';
  ok boolean;
begin
  -- 6. Viewer write -> denied
  perform dispatch.set_claims(A, 'viewer');
  begin
    insert into documents (tenant_id, title) values (A::uuid, 'by viewer');
    insert into dispatch.results values ('viewer_write', 'denied', 'allowed', false);
  exception when others then
    insert into dispatch.results values ('viewer_write', 'denied', 'denied', true);
  end;

  -- 7. Author write own tenant -> allowed
  perform dispatch.set_claims(A, 'author');
  begin
    insert into documents (tenant_id, title) values (A::uuid, 'by author A');
    insert into dispatch.results values ('author_write_own', 'allowed', 'allowed', true);
  exception when others then
    insert into dispatch.results values ('author_write_own', 'allowed', 'denied', false);
  end;

  -- 8. Author write OTHER tenant -> denied (with_check)
  perform dispatch.set_claims(A, 'author');
  begin
    insert into documents (tenant_id, title) values (B::uuid, 'cross-tenant write');
    insert into dispatch.results values ('author_write_cross', 'denied', 'allowed', false);
  exception when others then
    insert into dispatch.results values ('author_write_cross', 'denied', 'denied', true);
  end;

  -- 9. Audit insert allowed; update denied
  perform dispatch.set_claims(A, 'author');
  begin
    insert into audit_events (tenant_id, actor, action) values (A::uuid, 'user', 'doc.read');
    insert into dispatch.results values ('audit_insert', 'allowed', 'allowed', true);
  exception when others then
    insert into dispatch.results values ('audit_insert', 'allowed', 'denied', false);
  end;

  -- 10. Audit update -> denied (no update policy => 0 rows affected or error)
  perform dispatch.set_claims(A, 'tenant_admin');
  declare rc int; begin
    update audit_events set action = 'tampered' where tenant_id = A::uuid;
    get diagnostics rc = row_count;
    insert into dispatch.results values ('audit_update_denied', 'denied(0 rows)', rc::text || ' rows', rc = 0);
  exception when others then
    insert into dispatch.results values ('audit_update_denied', 'denied(0 rows)', 'error', true);
  end;

  -- 11. Document delete -> denied (no delete policy => 0 rows affected or error)
  perform dispatch.set_claims(A, 'tenant_admin');
  declare rc2 int; begin
    delete from documents where tenant_id = A::uuid;
    get diagnostics rc2 = row_count;
    insert into dispatch.results values ('doc_delete_denied', 'denied(0 rows)', rc2::text || ' rows', rc2 = 0);
  exception when others then
    insert into dispatch.results values ('doc_delete_denied', 'denied(0 rows)', 'error', true);
  end;
end $$;

select name, expected, actual, case when pass then 'PASS' else 'FAIL' end as result from dispatch.results order by name;
select count(*) filter (where pass) as passed, count(*) filter (where not pass) as failed from dispatch.results;
