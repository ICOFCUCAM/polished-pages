# ADR-006 — DOCX Rendering Strategy

- Status: Accepted
- Date: 2026-05-29
- Closes: DOCX renderer decision

## Context

The audit found two divergent hand-rolled OOXML generators (`export-docx`,
`export-book`) using a minimal manual ZIP — fragile, lacking real tables,
footnotes, and a TOC. Phase 1 needs institution-grade DOCX (native tables,
footnotes/endnotes, TOC field, headers/footers, styles, appendices) that renders
from the same Layout Model as the PDF renderer.

## Options considered

1. Maintained library (`docx` by dolanmiu) to build OOXML programmatically.
2. Hand-rolled OOXML assembler (extend current approach).
3. LibreOffice headless conversion (HTML/DOCX) in the worker.
4. Template-merge (docxtemplater + .docx templates).

## Decision

**Option 1 — the `docx` library**, wrapped behind a `DocxRenderer` interface so
it is swappable. It provides native tables, numbering, footnotes, headers/
footers, styles, sections, and TOC-field support, runs in the Node worker
(ADR-001), and eliminates the fragile manual ZIP/CRC code. The TOC is a **Word
field** (updates on open) — documented behavior. The two legacy generators are
retired from the render path.

## Advantages

- High fidelity for least effort; consolidates two legacy generators into one.
- Renders from the same Layout Model as the PDF renderer → cross-format parity.

## Disadvantages

- Library opinionation; charts embed as images (rasterized SVG → PNG) with a
  `CHART_RASTERIZED` warning.
- TOC field requires an update action (cosmetic).

## Risks & mitigations

- Library limitations / version churn → wrap in `DocxRenderer`, pin version,
  golden-file tests.

## Future migration path

If gov/enterprise needs PDF/DOCX pixel-parity, swap to LibreOffice-headless
conversion from the same HTML the PDF engine produces. The renderer interface
keeps this contained.
