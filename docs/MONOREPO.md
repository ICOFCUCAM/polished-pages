# Sovereign Dispatch — Monorepo Layout (Sprint 0 scaffold)

Sprint 0 introduces the Sovereign Dispatch packages **additively**, alongside the
existing application, without relocating or modifying the current SPA (that
restructure is Sprint 1 work, gated separately).

## Current state (after Sprint 0)
```
/                         existing Vite/React SPA (unchanged) — becomes apps/web in Sprint 1
├─ src/ ...               existing CV / Cover Letter / Book app  → future "Workspace Tools"
├─ supabase/ ...          existing edge functions (unchanged)
├─ docs/
│   ├─ adr/               ADR-001 … ADR-006  (Accepted)
│   └─ MONOREPO.md        this file
├─ packages/
│   ├─ ddm-schema/        FROZEN DDM v1 schema + scaffolds + shared validator + fixtures + test
│   └─ contract/          FROZEN Dispatch Contract v1 (DocumentRequest / DocumentResult)
└─ spikes/
    ├─ spk-a-chromium/    HTML→PDF render spike (B1 / ADR-001)
    └─ spk-b-rls/         tenant-isolation RLS spike (B2/B3 / ADR-003)
```

## Target state (Sprint 1 restructure — NOT done yet)
```
apps/web                  (the current SPA, moved)
services/dispatch-api     (Node/TS container — ADR-001)
services/dispatch-worker  (Node/TS + headless Chromium — ADR-001)
packages/ddm-schema       (as today)
packages/contract         (as today)
docs/adr, docs/...
```

## Why additive now
Moving the SPA in Sprint 0 would risk breaking the working CV/Letter/Book app for
zero Sprint-0 benefit. The frozen contract packages and spikes stand alone and
are what G0 requires. The physical move to `apps/web` happens in Sprint 1 under
its own gate, together with the M1–M6 migrations and the API/worker services.
