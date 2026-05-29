// Sovereign Dispatch — shared validation module (Epic 1 / ADR-005).
// The SINGLE validator used by /v1/validate, /v1/documents, and the worker.
// Pure functions, no I/O — guarantees identical verdicts across surfaces.
//
// Pipeline: JSON Schema (Ajv) → post-validation passes (size, cross-ref,
// cross-field, scaffold completeness). Returns { valid, errors, warnings, resolved }.

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = join(__dir, "..", "schemas");
const CONTRACT_DIR = join(__dir, "..", "..", "contract", "schemas");

const ddmSchema = JSON.parse(readFileSync(join(SCHEMA_DIR, "ddm.v1.0.json"), "utf8"));
const requestSchema = JSON.parse(readFileSync(join(CONTRACT_DIR, "document-request.v1.0.json"), "utf8"));
const resultSchema = JSON.parse(readFileSync(join(CONTRACT_DIR, "document-result.v1.0.json"), "utf8"));
const scaffolds = JSON.parse(readFileSync(join(SCHEMA_DIR, "scaffolds.v1.0.json"), "utf8")).profiles;

// Frozen size limits (Epic 1 §1.3 / ambiguity #3)
const LIMITS = {
  sections: 80, blocksTotal: 400, paragraphChars: 5000,
  tableCols: 40, tableRows: 500, citations: 100, evidence: 50, bodyBytes: 2 * 1024 * 1024,
};

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(ddmSchema, ddmSchema.$id);
ajv.addSchema(requestSchema, requestSchema.$id);
ajv.addSchema(resultSchema, resultSchema.$id);

const validateRequestSchema = ajv.getSchema(requestSchema.$id);
const validateDocumentSchema = ajv.getSchema(ddmSchema.$id);
const validateResultSchema = ajv.getSchema(resultSchema.$id);

function err(code, message, field) {
  return field !== undefined ? { code, message, field } : { code, message };
}

// ---- Post-validation passes (cannot be expressed in pure JSON Schema) ----

function checkSizeLimits(doc, errors) {
  if (!doc || typeof doc !== "object") return;
  const sections = Array.isArray(doc.sections) ? doc.sections : [];
  if (sections.length > LIMITS.sections) errors.push(err("DOC_TOO_LARGE", `sections exceed ${LIMITS.sections}`, "/document/sections"));
  let blockCount = 0;
  for (const s of sections) blockCount += Array.isArray(s.blocks) ? s.blocks.length : 0;
  if (blockCount > LIMITS.blocksTotal) errors.push(err("DOC_TOO_LARGE", `blocks exceed ${LIMITS.blocksTotal}`, "/document/sections"));
  if (Array.isArray(doc.citations) && doc.citations.length > LIMITS.citations) errors.push(err("DOC_TOO_LARGE", "too many citations", "/document/citations"));
  if (Array.isArray(doc.evidence) && doc.evidence.length > LIMITS.evidence) errors.push(err("DOC_TOO_LARGE", "too many evidence items", "/document/evidence"));
}

function collectCiteRefs(blocks, refs) {
  for (const b of blocks || []) {
    if (!b || typeof b !== "object") continue;
    if (b.type === "reference" && b.citeId) refs.push({ id: b.citeId, where: b.id });
    if (b.type === "quote" && b.citeId) refs.push({ id: b.citeId, where: b.id });
    if (b.type === "bullets") {
      const walk = (items) => { for (const it of items || []) { if (it.citeId) refs.push({ id: it.citeId, where: b.id }); if (it.children) walk(it.children); } };
      walk(b.items);
    }
  }
}

function checkCrossRefs(doc, errors, warnings) {
  if (!doc) return;
  const citeIds = new Set((doc.citations || []).map((c) => c.id));
  const evidenceIds = new Set((doc.evidence || []).map((e) => e.id));
  const signatureIds = new Set((doc.signatures || []).map((s) => s.id));
  const allSections = [...(doc.sections || []), ...(doc.appendices || [])];
  const refs = [];
  for (const s of allSections) collectCiteRefs(s.blocks, refs);
  for (const r of refs) if (!citeIds.has(r.id)) errors.push(err("UNRESOLVED_REF", `citeId '${r.id}' not found in citations`, `/document`));
  // image evidenceId + signatureRef resolution
  for (const s of allSections) for (const b of s.blocks || []) {
    if (b.type === "image" && b.evidenceId && !evidenceIds.has(b.evidenceId)) errors.push(err("UNRESOLVED_REF", `evidenceId '${b.evidenceId}' not found`, `/document`));
    if (b.type === "signature" && b.signatureRef && !signatureIds.has(b.signatureRef)) errors.push(err("UNRESOLVED_REF", `signatureRef '${b.signatureRef}' not found`, `/document`));
    if (b.type === "image" && !b.altText) warnings.push({ code: "MISSING_ALT_TEXT", blockId: b.id, detail: "image lacks altText (required for PDF/UA)" });
  }
  // unused citations (warning)
  const used = new Set(refs.map((r) => r.id));
  for (const id of citeIds) if (!used.has(id)) warnings.push({ code: "UNUSED_CITATION", detail: `citation '${id}' is never referenced` });
}

function checkCrossFields(req, errors) {
  const d = req.delivery || {};
  if (d.callbackAuth && !d.callbackUrl) errors.push(err("CALLBACK_URL_REQUIRED", "callbackAuth requires callbackUrl", "/delivery/callbackUrl"));
}

function checkScaffold(doc, errors, warnings) {
  const profile = scaffolds[doc.docType];
  if (!profile) { errors.push(err("DOC_TYPE_UNSUPPORTED", `docType '${doc.docType}' not supported in P1`, "/document/docType")); return null; }
  const roles = new Set((doc.sections || []).map((s) => s.role).filter(Boolean));
  const missing = profile.requiredRoles.filter((r) => !roles.has(r));
  if (missing.length) errors.push(err("SCAFFOLD_INCOMPLETE", `missing required section role(s): ${missing.join(", ")}`, "/document/sections"));
  // blockPolicy.require
  for (const [role, policy] of Object.entries(profile.blockPolicy || {})) {
    if (!policy.require) continue;
    const sec = (doc.sections || []).find((s) => s.role === role);
    if (sec) {
      const types = new Set((sec.blocks || []).map((b) => b.type));
      for (const reqType of policy.require) if (!types.has(reqType)) errors.push(err("BLOCK_POLICY_VIOLATION", `section '${role}' must contain a '${reqType}' block`, "/document/sections"));
    }
  }
  return { template: profile.template, version: profile.version, missingRequiredSections: missing, unknownBlocks: [] };
}

/**
 * Validate a full DocumentRequest. Returns the canonical verdict object used by
 * /v1/validate (200 body) and internally by /v1/documents and the worker.
 */
export function validateRequest(req) {
  const errors = [];
  const warnings = [];
  // 1. Schema
  const ok = validateRequestSchema(req);
  if (!ok) {
    for (const e of validateRequestSchema.errors || []) {
      errors.push(err("SCHEMA_INVALID", e.message || "schema error", e.instancePath || e.schemaPath));
    }
    return { valid: false, errors, warnings, resolved: null };
  }
  // 2. Size limits
  checkSizeLimits(req.document, errors);
  // 3. Scaffold completeness
  const resolved = checkScaffold(req.document, errors, warnings);
  // 4. Cross-references
  checkCrossRefs(req.document, errors, warnings);
  // 5. Cross-field
  checkCrossFields(req, errors);
  return { valid: errors.length === 0, errors, warnings, resolved };
}

/** Validate a bare DDM document (no envelope). Used by the worker on stored versions. */
export function validateDocument(doc) {
  const errors = [];
  const warnings = [];
  const ok = validateDocumentSchema(doc);
  if (!ok) {
    for (const e of validateDocumentSchema.errors || []) errors.push(err("SCHEMA_INVALID", e.message || "schema error", e.instancePath));
    return { valid: false, errors, warnings, resolved: null };
  }
  checkSizeLimits(doc, errors);
  const resolved = checkScaffold(doc, errors, warnings);
  checkCrossRefs(doc, errors, warnings);
  return { valid: errors.length === 0, errors, warnings, resolved };
}

export function validateResult(result) {
  const ok = validateResultSchema(result);
  return ok ? { valid: true, errors: [] } : { valid: false, errors: (validateResultSchema.errors || []).map((e) => err("SCHEMA_INVALID", e.message, e.instancePath)) };
}

export const _limits = LIMITS;
