# ADR-001 — Runtime Platform

- Status: Accepted
- Date: 2026-05-29
- Deciders: Sovereign Dispatch architecture
- Closes blocker: B1

## Context

The render model requires a long-running process able to run **headless
Chromium** (PDF), heavier OOXML/dependency workloads (DOCX), and an async worker
loop. The existing stack is a Vite/React SPA plus Supabase Deno edge functions.
Supabase Edge (Deno) cannot run Chromium and has execution-time limits; the SPA
host serves static assets only. A runtime that sits next to Supabase (DB,
Storage, queue) is required.

## Options considered

1. Supabase Edge Functions only (reuse current stack).
2. Container service (Cloud Run / Fly.io / Render / Railway / ECS Fargate)
   running API + workers.
3. Kubernetes (EKS/GKE) for full control.
4. Serverless container with browser (Lambda + Chromium layer / managed
   Chromium such as browserless).

## Decision

**Option 2 — a container service**, with the API and workers as two separately
scalable services:

- `dispatch-api` — light, scales on request volume.
- `dispatch-worker` — Chromium image, scales on queue depth.

Recommended platform for Phase 1: **Cloud Run or Fly.io** (autoscale-to-zero,
fast to stand up, cheap). Supabase remains the DB / Storage / Auth backbone.

## Advantages

- Runs Chromium and PDF/A tooling (veraPDF) in a controlled image with
  deterministic, embedded fonts.
- Horizontal scale by queue depth; clean separation from the SPA.
- Preserves the existing Supabase investment.

## Disadvantages

- New infra surface (CI image builds, secrets, networking to Supabase).
- Cold-start latency for Chromium; container image weight.

## Risks & mitigations

- Chromium memory spikes under concurrency → dedicated worker pool, memory
  ceilings, per-job timeout.
- Cold-start latency → warm pool / min instances.
- Connection limits to Supabase → use the Supabase pooler (Supavisor/pgBouncer).

## Future migration path

Cloud Run/Fly → Kubernetes when concurrency/SLA (Phase 4 gov/enterprise,
airgapped) demands it. The container image is portable; only orchestration
changes. Managed Chromium remains a fallback.

## Sprint 0 evidence

SPK-A proves a headless Chromium process renders an Executive-Briefing-shaped
HTML to a valid PDF with chrome, deterministically. See
`spikes/spk-a-chromium/`.
