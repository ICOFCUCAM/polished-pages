# Sprint 0 Spikes

De-risking spikes that gate G0 (see `docs/ROADMAP` discussions / Phase 1 master spec).

## SPK-A — Chromium HTML→PDF (closes B1, validates ADR-001)
`spk-a-chromium/` — renders an Executive-Briefing HTML to a multi-page PDF via a
headless Chromium binary, with cover page, classification banners, running
header, "Page X of Y" footer, TOC, and a table. Computes sha256 and proves
determinism across 3 runs after timestamp normalization (the same normalization
the PDF/A sealer will apply).

```
cd spk-a-chromium && node run.mjs        # writes EVIDENCE.json, out-*.pdf
```

Result (recorded in `spk-a-chromium/EVIDENCE.json`): valid 3-page PDF, warm
render well under the 5s target, deterministic-after-normalization = true.

## SPK-B — Tenant isolation / RLS (closes B2/B3, validates ADR-003)
`spk-b-rls/` — a real Postgres database with RLS policies keyed to a JWT-claims
GUC (emulating the Supabase access-token hook). Proves the full isolation matrix.

```
# requires a local postgres; see spk-b-rls/EVIDENCE.txt for the captured run
psql -d spkb -f spk-b-rls/schema.sql
psql -d spkb -f spk-b-rls/matrix.sql
```

Result (recorded in `spk-b-rls/EVIDENCE.txt`): 11/11 — cross-tenant denied,
no-claim denies (not allow-all), user≡service parity, role-gated writes, audit
append-only, deletes denied.

> These spikes are throwaway evidence, not production code. Sprint 1 implements
> the real `dispatch-api` / `dispatch-worker` / migrations against these proofs.
