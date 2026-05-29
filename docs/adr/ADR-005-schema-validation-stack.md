# ADR-005 — Schema Validation Stack

- Status: Accepted
- Date: 2026-05-29
- Closes blocker: B5 (tooling half)

## Context

DDM v1 and Dispatch Contract v1 must be frozen as machine-validatable schemas
with one validator shared by the API (TS) and workers (TS), and consumable by an
external party (Emergency AI). They must not drift between `/validate` and the
worker.

## Options considered

1. JSON Schema (draft 2020-12) + Ajv; TS types via `json-schema-to-typescript`.
2. Zod as source of truth (repo already depends on `zod`), JSON Schema generated
   from it.
3. TypeBox (JSON Schema + TS types in one).

## Decision

**Option 1 — JSON Schema (2020-12) + Ajv as the canonical contract.** The
contract is published to an external consumer in a language-neutral form; JSON
Schema is the lingua franca. TS types are generated from the schemas for internal
use. A thin Zod mirror MAY be used at the SaaS form layer for convenience, but it
is not the source of truth.

Cross-field and cross-reference rules that pure JSON Schema cannot express
(citation/evidence/signature resolution, `callbackAuth` ⇒ `callbackUrl`, size
limits, docType scaffold completeness) are implemented as a **shared
post-validation pass** imported by `/validate`, `/documents`, and the worker —
guaranteeing identical verdicts.

## Advantages

- Language-neutral, publishable contract.
- Ajv is fast, supports 2020-12, `$ref`, and formats.
- One schema + one validator module → guaranteed `/validate` ≡ worker parity.

## Disadvantages

- JSON Schema authoring is more verbose than Zod.
- Two type systems if Zod is also used at the edge (kept optional/minimal).

## Risks & mitigations

- Schema/validator drift → schemas live in one shared package
  (`packages/ddm-schema`, `packages/contract`) imported by both; CI fixture
  tests (valid + invalid) enforce parity.

## Future migration path

Schemas are versioned (`ddmVersion`, `schemaVersion`); additive minors, major =
new `$id`. A versioned schema-registry URL can be published for partners.

## Sprint 0 evidence

`packages/ddm-schema` and `packages/contract` contain the frozen schemas, the
shared validator (Ajv + post-validation passes), and 5 valid + 15 invalid
fixtures, all asserted by an automated test.
