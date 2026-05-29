# Architecture Decision Records — Sovereign Dispatch

This directory records the architecture decisions for **Sovereign Dispatch —
Institutional Publication Infrastructure**, the publication layer of the
Sovereign ecosystem (`Sovereign → Emergency AI → Veritas → Sovereign Dispatch`).

ADRs are immutable once `Accepted`. A reversal is a new ADR that supersedes an
older one (never an edit of history).

| ADR | Title | Status |
|-----|-------|--------|
| [001](ADR-001-runtime-platform.md) | Runtime Platform | Accepted |
| [002](ADR-002-authentication-model.md) | Authentication Model | Accepted |
| [003](ADR-003-tenant-claim-strategy.md) | Tenant Claim Strategy | Accepted |
| [004](ADR-004-ai-dependency-scope.md) | AI Dependency Scope | Accepted |
| [005](ADR-005-schema-validation-stack.md) | Schema Validation Stack | Accepted |
| [006](ADR-006-docx-rendering-strategy.md) | DOCX Rendering Strategy | Accepted |

Scope note: these decisions govern **Phase 1**. Government/Enterprise concerns
(OIDC, classification enforcement, sovereign-vault residency, signing) are
explicitly deferred and noted in each ADR's *Future migration path*.
