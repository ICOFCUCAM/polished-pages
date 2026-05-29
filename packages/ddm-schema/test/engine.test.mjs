// Sovereign Dispatch — Engine Core (Layout Model) tests (Epic 5).
// Pure-function tests over real fixtures: numbering, ordering, ref resolution,
// scaffold/parity errors, determinism, presentation-neutrality.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildLayout, EngineError, ENGINE_VERSION } from "../src/engine.mjs";
import { validateDocument } from "../src/validator.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const FIX = join(__dir, "..", "fixtures", "valid");
const load = (f) => JSON.parse(readFileSync(join(FIX, f), "utf8"));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  PASS ${m}`); } else { fail++; console.log(`  FAIL ${m}`); } };
const throws = (fn, code, m) => {
  try { fn(); ok(false, `${m} (expected throw ${code})`); }
  catch (e) { ok(e instanceof EngineError && e.code === code, `${m} → ${e.code}`); }
};

console.log("== Engine Core (Layout Model) ==");

// --- V2: full exec briefing -------------------------------------------------
const v2 = load("V2-full-exec-briefing.json").document;
const lm = buildLayout(v2, { engineVersion: ENGINE_VERSION });

ok(lm.templateBinding.template === "exec-brief" && lm.templateBinding.version === 1, "template bound (exec-brief v1)");
ok(lm.docType === "executive_briefing", "docType carried");

// Ordering: body follows roleOrder (exec_summary, key_judgements, analysis, recommendation);
// appendix extracted to the end.
const bodyRoles = lm.body.map((s) => s.role);
ok(JSON.stringify(bodyRoles) === JSON.stringify(["executive_summary", "key_judgements", "analysis", "recommendation"]),
   `body ordered by roleOrder (${bodyRoles.join(",")})`);
ok(lm.appendices.length === 1 && lm.appendices[0].role === "appendices", "appendix extracted to appendices[]");

// Section numbering (hierarchical, level-1 → 1,2,3,4)
const nums = lm.body.map((s) => s.number);
ok(JSON.stringify(nums) === JSON.stringify(["1", "2", "3", "4"]), `section numbers 1..4 (${nums.join(",")})`);
ok(lm.appendices[0].number === "A", "appendix lettered A");

// Figure/Table numbering across the analysis section (table b5 → Table 1, chart b6 → Figure 1),
// image b10 in appendix → Figure 2 (per-document sequencing).
ok(lm.tableList.length === 1 && lm.tableList[0].number === "Table 1", "table numbered Table 1");
ok(lm.figureList.length === 2, "two figures (chart + appendix image)");
ok(lm.figureList[0].number === "Figure 1" && lm.figureList[1].number === "Figure 2", "figures sequential across doc");

// Reference resolution: b9 reference→c1 gets ordinal 1; c2 unused → warning.
const analysis = lm.body.find((s) => s.role === "analysis");
const refBlock = analysis.blocks.find((b) => b.kind === "reference");
ok(refBlock && refBlock.noteRef === 1, "reference c1 resolved to ordinal 1");
ok(lm.sources && lm.sources.entries.length === 1 && lm.sources.entries[0].citationId === "c1", "sources list has only used citation c1");
ok(lm.warnings.some((w) => w.code === "UNUSED_CITATION"), "unused citation c2 → warning");
ok(lm.renderHints.citationStyle === "endnote", "citationStyle from profile = endnote");

// TOC: 4 body entries (level ≤ 2) + 1 appendix entry; no page numbers.
ok(lm.toc.length === 5, `toc has 5 entries (${lm.toc.length})`);
ok(lm.toc.every((e) => !("page" in e)), "toc carries no page numbers (render-time)");

// Presentation-neutrality: LM JSON contains no fonts/pages/colors keys.
const lmStr = JSON.stringify(lm);
ok(!/"font"|"pageSize"|"margin"|"color"/.test(lmStr), "LM is presentation-neutral (no fonts/pages/colors)");

// Block resolution: kpi/callout/chart carried with resolved fields.
const kpi = analysis.blocks.find((b) => b.kind === "kpi");
ok(kpi && kpi.items[0].label === "Readiness", "kpi block resolved");
const chart = analysis.blocks.find((b) => b.kind === "chart");
ok(chart && chart.number === "Figure 1" && chart.fallback === "table", "chart resolved with figure number + fallback");
const img = lm.appendices[0].blocks.find((b) => b.kind === "image");
ok(img && img.source.evidenceId === "e1" && img.altText === "map of region", "image resolved (evidence source + altText)");

// --- Determinism: identical inputs → byte-identical LM -----------------------
const lm2 = buildLayout(load("V2-full-exec-briefing.json").document, { engineVersion: ENGINE_VERSION });
ok(JSON.stringify(lm) === JSON.stringify(lm2), "deterministic: identical inputs → identical LM");

// --- V3 SITREP & V4 Policy Paper bind their profiles -------------------------
const v3 = load("V3-situation-report.json").document;
const lm3 = buildLayout(v3);
ok(lm3.templateBinding.template === "sitrep" && lm3.renderHints.citationStyle === "numeric", "sitrep profile bound (numeric)");

const v4 = load("V4-policy-paper.json").document;
const lm4 = buildLayout(v4);
ok(lm4.templateBinding.template === "policy-paper" && lm4.renderHints.tocDepth === 3, "policy-paper profile bound (tocDepth 3)");

// --- Explicit Section.order overrides roleOrder ------------------------------
{
  const doc = load("V2-full-exec-briefing.json").document;
  // Force recommendation (normally last of the 4) to sort first via explicit order.
  doc.sections.find((s) => s.role === "recommendation").order = 0;
  const lmo = buildLayout(doc);
  ok(lmo.body[0].role === "recommendation", "explicit Section.order overrides roleOrder");
}

// --- Parity: engine errors mirror the shared validator ----------------------
{
  const doc = load("V2-full-exec-briefing.json").document;
  doc.sections = doc.sections.filter((s) => s.role !== "recommendation"); // break scaffold
  ok(validateDocument(doc).valid === false, "validator rejects missing-recommendation doc");
  throws(() => buildLayout(doc), "SCAFFOLD_INCOMPLETE", "engine throws on missing required role");
}
{
  const doc = load("V2-full-exec-briefing.json").document;
  doc.sections.find((s) => s.role === "analysis").blocks.push({ id: "bx", type: "reference", citeId: "zzz" });
  throws(() => buildLayout(doc), "UNRESOLVED_REF", "engine throws on unresolved citeId");
}
{
  const doc = load("V2-full-exec-briefing.json").document;
  doc.docType = "board_report"; // valid enum, but no P1 scaffold
  throws(() => buildLayout(doc), "DOC_TYPE_UNSUPPORTED", "engine throws on unsupported docType");
}

console.log(`\nTOTAL: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
