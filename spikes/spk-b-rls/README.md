# SPK-B — Tenant Isolation / RLS Spike

Closes blockers B2/B3; validates ADR-003 (tenant claim strategy).

- `schema.sql` — claim helpers (`dispatch.current_tenant/current_role`, hardened
  to treat a missing/empty claims GUC as NULL → DENY), the `documents` and
  `audit_events` tables, RLS policies, and seed rows.
- `matrix.sql` — the 11-case isolation matrix, run as the unprivileged
  `dispatch_app` role (RLS forced).
- `EVIDENCE.txt` — captured run output (11/11 PASS).

The claims GUC `request.jwt.claims` is the exact mechanism Supabase/PostgREST
use to surface JWT claims to RLS, so these policies are written as they will be
in production migrations (Epic 2 / M2).

## Matrix
| Case | Expected |
|---|---|
| user in A reads A | visible |
| user in A reads B | denied |
| service in A reads A | visible (parity) |
| service in A reads B | denied |
| no claim reads all | denied (NOT allow-all) |
| viewer write | denied |
| author write own tenant | allowed |
| author write other tenant | denied |
| audit insert | allowed |
| audit update | denied (no policy → 0 rows) |
| document delete | denied (no policy → 0 rows) |
