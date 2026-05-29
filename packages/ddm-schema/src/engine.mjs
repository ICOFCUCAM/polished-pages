// Sovereign Dispatch — Engine Core / Layout Model (Epic 5).
//
// The layer BETWEEN validated DDM and the format renderers (Epics 6/7).
// Pure & deterministic: buildLayout(doc, ctx) → LayoutModel, no I/O, no AI,
// no time-dependence except the passed-in renderContext. Same inputs → identical
// LM → reproducible artifacts.
//
// Core principle: the engine resolves ALL semantics (order, numbering, refs,
// scaffold, appendices, TOC); renderers resolve ONLY presentation. No renderer
// ever computes a number, resolves a citation, or decides section order.
//
// Parity: scaffold/ref verdicts come from the SAME shared validator used by
// /v1/validate and the worker (validateDocument), so the engine never produces
// an LM for a document the API would reject, and verdicts never diverge.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateDocument } from "./validator.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const scaffolds = JSON.parse(
  readFileSync(join(__dir, "..", "schemas", "scaffolds.v1.0.json"), "utf8"),
).profiles;

export const ENGINE_VERSION = "dispatch-engine@1.0.0";

/** Thrown for deterministic faults (→ worker marks job failed, no retry). */
export class EngineError extends Error {
  constructor(code, message, errors) {
    super(message);
    this.code = code;
    this.errors = errors || [];
  }
}

const A_CODE = "A".charCodeAt(0);
function appendixLetter(i) {
  // 0→A … 25→Z, 26→AA … (sufficient; ≤40 appendices per Epic 1 limits)
  let n = i, s = "";
  do { s = String.fromCharCode(A_CODE + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
}

// ---- Stage 1: normalize -----------------------------------------------------
// Apply defaults without mutating the caller's object. Ids are trusted, never
// regenerated (cross-refs depend on them).
function normalizeBlock(b, warnings) {
  const out = { ...b };
  switch (b.type) {
    case "paragraph": out.style = b.style ?? "normal"; break;
    case "bullets": out.ordered = b.ordered ?? false; break;
    default: break;
  }
  return out;
}

function normalizeSection(s, warnings) {
  return {
    ...s,
    kind: s.kind ?? "body",
    role: s.role ?? null,
    blocks: (s.blocks || []).map((b) => normalizeBlock(b, warnings)),
  };
}

// ---- Stage 2: resolve references -------------------------------------------
// Build symbol tables; assign citation ordinals by first appearance across the
// ordered body+appendices walk. Returns { ordinalByCite, notes, usedCites }.
function resolveReferences(orderedSections, doc, citationStyle) {
  const citationsById = new Map((doc.citations || []).map((c) => [c.id, c]));
  const ordinalByCite = new Map();
  const usedOrder = [];

  const noteCite = (id) => {
    if (!citationsById.has(id)) return; // validator already guarantees resolvable
    if (!ordinalByCite.has(id)) { ordinalByCite.set(id, ordinalByCite.size + 1); usedOrder.push(id); }
  };

  const walkItems = (items) => {
    for (const it of items || []) { if (it.citeId) noteCite(it.citeId); if (it.children) walkItems(it.children); }
  };

  for (const s of orderedSections) {
    for (const b of s.blocks || []) {
      if ((b.type === "reference" || b.type === "quote") && b.citeId) noteCite(b.citeId);
      if (b.type === "bullets") walkItems(b.items);
    }
  }

  const placement = citationStyle === "footnote" ? "footnote" : "endnote";
  const notes = usedOrder.map((id) => {
    const c = citationsById.get(id);
    return {
      ordinal: ordinalByCite.get(id),
      citationId: id,
      placement,
      content: formatCitation(c),
    };
  });
  return { ordinalByCite, notes, usedCites: new Set(usedOrder), citationsById };
}

function formatCitation(c) {
  // Engine supplies ordered fields + a convenience string; renderer does typography.
  const parts = [];
  if (c.authors?.length) parts.push(c.authors.join(", "));
  if (c.title) parts.push(c.title);
  if (c.publisher) parts.push(c.publisher);
  if (c.publishedDate) parts.push(c.publishedDate);
  if (c.url) parts.push(c.url);
  if (c.locator) parts.push(c.locator);
  return { fields: c, text: parts.join(". ") };
}

// ---- Stage 5: ordering (Epic 1 ambiguity #4 resolution) --------------------
// 1) explicit order asc; 2) by profile roleOrder position; 3) free sections keep
// original position, appended; 4) appendices/annex extracted to end; 5) sources last.
function orderSections(sections, profile) {
  const roleRank = new Map((profile.roleOrder || []).map((r, i) => [r, i]));
  const body = [];
  const appendices = [];
  sections.forEach((s, idx) => (s.kind === "appendix" || s.kind === "annex" ? appendices : body).push({ s, idx }));

  const ranked = body.map(({ s, idx }) => ({
    s, idx,
    hasOrder: Number.isInteger(s.order),
    order: Number.isInteger(s.order) ? s.order : null,
    roleRank: s.role && roleRank.has(s.role) ? roleRank.get(s.role) : null,
  }));

  ranked.sort((a, b) => {
    if (a.hasOrder && b.hasOrder) return a.order - b.order || a.idx - b.idx;
    if (a.hasOrder !== b.hasOrder) return a.hasOrder ? -1 : 1; // explicit order first
    const ar = a.roleRank, br = b.roleRank;
    if (ar != null && br != null) return ar - br || a.idx - b.idx;
    if ((ar != null) !== (br != null)) return ar != null ? -1 : 1; // roled before free
    return a.idx - b.idx; // free: stable original order
  });

  // appendices: keep explicit order then original position
  appendices.sort((a, b) => {
    const ao = Number.isInteger(a.s.order), bo = Number.isInteger(b.s.order);
    if (ao && bo) return a.s.order - b.s.order || a.idx - b.idx;
    if (ao !== bo) return ao ? -1 : 1;
    return a.idx - b.idx;
  });

  return { body: ranked.map((r) => r.s), appendices: appendices.map((a) => a.s) };
}

// ---- Stage 6: numbering -----------------------------------------------------
function numberBody(bodySections, numbered) {
  const counters = [0, 0, 0, 0]; // levels 1..4
  return bodySections.map((s) => {
    let number = null;
    if (numbered) {
      const lvl = Math.min(Math.max(s.level, 1), 4);
      counters[lvl - 1] += 1;
      for (let i = lvl; i < 4; i++) counters[i] = 0;
      number = counters.slice(0, lvl).join(".");
    }
    return { ...s, number };
  });
}

function numberAppendices(appendixSections) {
  return appendixSections.map((s, i) => ({ ...s, number: appendixLetter(i) }));
}

// Assign Figure/Table numbers across the ordered body (then appendices),
// per-document sequencing (P1 default). Returns lists + a nodeId→number map.
function numberFiguresTables(sections) {
  let fig = 0, tbl = 0;
  const figureList = [], tableList = [];
  const numberByNode = new Map();
  for (const s of sections) {
    for (const b of s.blocks || []) {
      if (b.type === "chart" || b.type === "image") {
        fig += 1; const n = `Figure ${fig}`;
        numberByNode.set(b.id, n);
        figureList.push({ number: n, caption: b.caption || null, nodeId: b.id });
      } else if (b.type === "table") {
        tbl += 1; const n = `Table ${tbl}`;
        numberByNode.set(b.id, n);
        tableList.push({ number: n, caption: b.caption || null, nodeId: b.id });
      }
    }
  }
  return { figureList, tableList, numberByNode };
}

// ---- Block resolution (presentation-neutral) -------------------------------
function resolveBlock(b, numberByNode, ordinalByCite) {
  const node = { nodeId: b.id, kind: b.type };
  switch (b.type) {
    case "paragraph": return { ...node, text: b.text, style: b.style ?? "normal" };
    case "bullets": {
      const mark = (items) => (items || []).map((it) => ({
        text: it.text,
        noteRef: it.citeId ? ordinalByCite.get(it.citeId) ?? null : null,
        children: it.children ? mark(it.children) : undefined,
      }));
      return { ...node, ordered: b.ordered ?? false, items: mark(b.items) };
    }
    case "table": return {
      ...node, number: numberByNode.get(b.id) ?? null, caption: b.caption ?? null,
      columns: b.columns, rows: b.rows, footnotes: b.footnotes ?? [],
    };
    case "kpi": return { ...node, items: b.items };
    case "chart": return {
      ...node, number: numberByNode.get(b.id) ?? null, caption: b.caption ?? null,
      chartType: b.chartType, spec: b.spec, fallback: b.fallback ?? "table",
    };
    case "quote": return {
      ...node, text: b.text, attribution: b.attribution ?? null,
      noteRef: b.citeId ? ordinalByCite.get(b.citeId) ?? null : null,
    };
    case "callout": return { ...node, style: b.style, title: b.title ?? null, text: b.text };
    case "timeline": return { ...node, events: b.events };
    case "image": return {
      ...node, number: numberByNode.get(b.id) ?? null,
      source: b.evidenceId ? { evidenceId: b.evidenceId } : { src: b.src },
      caption: b.caption ?? null, credit: b.credit ?? null, altText: b.altText,
    };
    case "reference": return { ...node, noteRef: ordinalByCite.get(b.citeId) ?? null, citeId: b.citeId };
    case "pagebreak": return { ...node };
    case "signature": return { ...node, signatureRef: b.signatureRef };
    default: return { ...node, kind: "paragraph", text: "", _fallbackFrom: b.type };
  }
}

function toSectionNode(s) {
  return {
    nodeId: s.id, role: s.role ?? null, kind: s.kind ?? "body",
    number: s.number ?? null, heading: s.heading, level: s.level,
    classification: s.classification ?? null, blocks: s._resolvedBlocks,
  };
}

// ---- Public API -------------------------------------------------------------
/**
 * Build the immutable, format-agnostic Layout Model from a validated DDM doc.
 * @param {object} doc - a DDM DispatchDocument (the inner `document`).
 * @param {object} [ctx] - render context: { date, engineVersion }.
 * @returns {object} LayoutModel
 * @throws {EngineError} on deterministic faults (invalid doc / unsupported docType).
 */
export function buildLayout(doc, ctx = {}) {
  // Stage 4 (parity): trust the SAME validator the API uses.
  const verdict = validateDocument(doc);
  if (!verdict.valid) {
    const primary = verdict.errors[0] || { code: "SCHEMA_INVALID", message: "invalid document" };
    throw new EngineError(primary.code, primary.message, verdict.errors);
  }
  const warnings = [...(verdict.warnings || [])];

  // Stage 3: bind template (validator already proved docType supported).
  const profile = scaffolds[doc.docType];
  const numbered = profile.numbered !== false;
  const citationStyle = profile.citationStyle || "numeric";
  const tocDepth = profile.tocDepth ?? 2;

  // Stage 1: normalize.
  const sections = (doc.sections || []).map((s) => normalizeSection(s, warnings));

  // Stage 5: order (body vs appendices), with appendices from sections AND the
  // top-level appendices[] array (both are valid DDM placements).
  const topAppendices = (doc.appendices || []).map((s) => normalizeSection({ ...s, kind: s.kind ?? "appendix" }, warnings));
  const { body: orderedBody, appendices: sectionAppendices } = orderSections(sections, profile);
  const orderedAppendices = [...sectionAppendices, ...topAppendices];

  // Stage 6: numbering (sections, appendices, figures/tables across body+appendices).
  const numberedBody = numberBody(orderedBody, numbered);
  const numberedAppendices = numberAppendices(orderedAppendices);
  const { figureList, tableList, numberByNode } = numberFiguresTables([...numberedBody, ...numberedAppendices]);

  // Stage 2: references + notes (over the same ordered walk).
  const { ordinalByCite, notes, usedCites, citationsById } =
    resolveReferences([...numberedBody, ...numberedAppendices], doc, citationStyle);

  // Stage 7: resolve blocks + synthesize sources.
  const resolveSectionBlocks = (s) => ({ ...s, _resolvedBlocks: (s.blocks || []).map((b) => resolveBlock(b, numberByNode, ordinalByCite)) });
  const bodyNodes = numberedBody.map(resolveSectionBlocks).map(toSectionNode);
  const appendixNodes = numberedAppendices.map(resolveSectionBlocks).map(toSectionNode);

  const sources = notes.length || (doc.citations || []).length
    ? {
        style: citationStyle,
        entries: notes.map((n) => ({
          ordinal: n.ordinal, citationId: n.citationId,
          formattedFields: citationsById.get(n.citationId)?.fields ?? citationsById.get(n.citationId) ?? null,
          grading: citationsById.get(n.citationId)?.sourceGrading ?? null,
        })),
      }
    : null;

  // Stage 8: TOC (body headings ≤ tocDepth + appendix entries; no page numbers).
  const toc = [
    ...bodyNodes
      .filter((s) => s.level <= tocDepth)
      .map((s) => ({ number: s.number, title: s.heading, targetNodeId: s.nodeId, level: s.level, kind: "body" })),
    ...appendixNodes.map((s) => ({ number: s.number, title: s.heading, targetNodeId: s.nodeId, level: 1, kind: "appendix" })),
  ];

  // Stage 9: emit LM.
  const banner = (profile.classificationBanner ?? "if-sensitive");
  return {
    ddmVersion: doc.ddmVersion,
    docType: doc.docType,
    engineVersion: ctx.engineVersion || ENGINE_VERSION,
    templateBinding: { template: profile.template, version: profile.version },
    classification: doc.classification,
    metadata: doc.metadata,
    branding: doc.branding ?? null,
    cover: {
      title: doc.metadata?.title ?? "",
      subtitle: doc.metadata?.subtitle ?? null,
      authors: doc.metadata?.authors ?? [],
      owningBody: doc.metadata?.owningBody ?? null,
      date: doc.metadata?.date ?? ctx.date ?? null,
      referenceCode: doc.metadata?.referenceCode ?? null,
      version: doc.metadata?.version ?? null,
      status: doc.metadata?.status ?? null,
      distribution: doc.metadata?.distribution ?? [],
      classification: doc.classification,
    },
    toc,
    body: bodyNodes,
    appendices: appendixNodes,
    sources,
    figureList,
    tableList,
    notes,
    warnings,
    renderHints: { tocDepth, numbered, citationStyle, classificationBanner: banner },
  };
}
