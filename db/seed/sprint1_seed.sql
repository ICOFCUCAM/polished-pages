-- Sprint 1 seed: two tenants, a service client per tenant, and memberships.
-- Service secret hash = sha256('secret-A' / 'secret-B') to match auth.mjs dev shim.

insert into dispatch.tenants (id, slug, name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','tenant-a','Tenant A'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','tenant-b','Tenant B')
on conflict (slug) do nothing;

insert into dispatch.memberships (tenant_id, user_id, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','author')
on conflict do nothing;

-- sha256('secret-A') and sha256('secret-B')
insert into dispatch.service_clients (tenant_id, name, client_id, secret_hash, scopes) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','emergency-ai-A','svc-a',
   encode(digest('secret-A','sha256'),'hex'), array['dispatch:validate','dispatch:render','dispatch:read']),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','emergency-ai-B','svc-b',
   encode(digest('secret-B','sha256'),'hex'), array['dispatch:validate','dispatch:render','dispatch:read'])
on conflict (client_id) do nothing;
