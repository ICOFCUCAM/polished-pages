# ADR-004 — AI Dependency Scope

- Status: Accepted
- Date: 2026-05-29
- Closes blocker: B4

## Context

Generation today calls the Lovable AI Gateway (`google/gemini-3-flash-preview`)
with `LOVABLE_API_KEY`. For an institutional/government product that will
eventually handle classified content, a hard dependency on a consumer AI gateway
is a data-handling and positioning liability. Question: is AI generation on the
Phase-1 critical path?

## Options considered

1. AI out of the critical path: Phase 1 renders **pre-built DDM**. Emergency AI
   sends DDM; SaaS authoring composes DDM via forms. AI generation stays only
   behind Workspace Tools (CV/letter/book) using the existing gateway.
2. Keep AI in-path: Phase 1 generates Executive Briefings from prompts.
3. Swap the gateway now for a direct enterprise model provider.

## Decision

**Option 1.** The **render engine never calls AI.** The Phase-1 institutional
path is `DDM in → artifacts out`, deterministic and golden-file testable.
AI-assisted briefing drafting is an *optional* SaaS convenience that produces
DDM, isolated from the engine; the existing gateway is retained only for the
demoted Workspace Tools.

## Advantages

- Removes a third-party gateway from the institutional critical path.
- Renders are deterministic and testable.
- Sidesteps classified-data-to-consumer-gateway risk in Phase 1.

## Disadvantages

- The SaaS "generate a briefing with AI" experience is thinner in Phase 1
  (templated assist rather than full generation). Acceptable — Emergency AI is
  the real content source.

## Risks & mitigations

- Product perception ("where is the AI?") → the AI is upstream (Emergency AI);
  Dispatch is publication infrastructure.

## Future migration path

Phase 2+: a provider-abstracted generation service (pluggable model,
enterprise/self-hosted option, no consumer gateway) feeding DDM. The engine
stays AI-free; generation remains a separate, swappable upstream.
