// Generates the 5 valid + 15 invalid Sprint-0 fixtures (Epic 1 §6) on disk.
// Each fixture is a full DocumentRequest. Invalid fixtures carry an `_expect`
// sidecar (the expected primary error code) consumed by run.mjs.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const VALID = join(__dir, "..", "fixtures", "valid");
const INVALID = join(__dir, "..", "fixtures", "invalid");
mkdirSync(VALID, { recursive: true });
mkdirSync(INVALID, { recursive: true });

const UUID = "00000000-0000-4000-8000-000000000001";
const clone = (o) => JSON.parse(JSON.stringify(o));

function baseRequest() {
  return {
    schemaVersion: "1.0",
    idempotencyKey: UUID,
    source: { system: "saas-ui", tenantId: "11111111-1111-4111-8111-111111111111" },
    document: {
      ddmVersion: "1.0",
      docType: "executive_briefing",
      metadata: { title: "Regional Stability Brief", date: "2026-05-29", status: "final" },
      classification: { scheme: "none", level: "UNCLASSIFIED" },
      sections: [
        { id: "s-sum", role: "executive_summary", heading: "Executive Summary", level: 1,
          blocks: [{ id: "b1", type: "paragraph", text: "BLUF: situation stable.", style: "lead" }] },
        { id: "s-kj", role: "key_judgements", heading: "Key Judgements", level: 1,
          blocks: [{ id: "b2", type: "bullets", ordered: true, items: [{ text: "Judgement one." }, { text: "Judgement two." }] }] },
        { id: "s-an", role: "analysis", heading: "Analysis", level: 1,
          blocks: [{ id: "b3", type: "paragraph", text: "Analysis body." }] },
        { id: "s-rec", role: "recommendation", heading: "Recommendation", level: 1,
          blocks: [{ id: "b4", type: "callout", style: "recommendation", text: "Proceed with option A." }] }
      ]
    },
    outputs: ["pdf"],
    delivery: { mode: "async", storage: "signed_url", ttlSeconds: 604800 }
  };
}

// ---------------- VALID ----------------
const valids = {};

valids["V1-minimal-exec-briefing"] = baseRequest();

valids["V2-full-exec-briefing"] = (() => {
  const r = baseRequest();
  r.outputs = ["pdf", "docx"];
  r.delivery.callbackUrl = "https://emergency-ai.example/cb";
  r.delivery.callbackAuth = { type: "hmac" };
  const d = r.document;
  d.sections.find((s) => s.role === "analysis").blocks.push(
    { id: "b5", type: "table", caption: "Comparison", columns: [{ key: "opt", label: "Option" }, { key: "cost", label: "Cost", align: "right" }],
      rows: [[{ text: "A" }, { text: "Low" }], [{ text: "B" }, { text: "High" }]] },
    { id: "b6", type: "chart", chartType: "bar", caption: "Trend",
      spec: { xKey: "month", series: [{ key: "v", label: "Value" }], data: [{ month: "Jan", v: 3 }, { month: "Feb", v: 5 }] } },
    { id: "b7", type: "kpi", items: [{ label: "Readiness", value: "82", unit: "%", trend: "up" }] },
    { id: "b8", type: "callout", style: "risk", text: "Escalation risk in Q3." },
    { id: "b9", type: "reference", citeId: "c1" }
  );
  d.sections.push({ id: "s-app", kind: "appendix", role: "appendices", heading: "Methodology", level: 1,
    blocks: [{ id: "b10", type: "image", evidenceId: "e1", altText: "map of region", caption: "Region map" }] });
  d.citations = [
    { id: "c1", type: "web", title: "Source A", url: "https://example.org/a" },
    { id: "c2", type: "document", title: "Source B" }
  ];
  d.evidence = [{ id: "e1", kind: "image", storageRef: "evidence/e1.png", altText: "map", sha256: "a".repeat(64) }];
  return r;
})();

valids["V3-situation-report"] = (() => {
  const r = baseRequest();
  r.document.docType = "situation_report";
  r.compliance = { pdfProfile: "pdf_a_2b", accessibility: "none" };
  r.document.sections = [
    { id: "s-cs", role: "current_status", heading: "Current Status", level: 1,
      blocks: [{ id: "b1", type: "kpi", items: [{ label: "Sites affected", value: "12" }] }] },
    { id: "s-tl", role: "timeline", heading: "Timeline", level: 1,
      blocks: [{ id: "b2", type: "timeline", events: [{ ts: "0800", label: "Onset" }, { ts: "1200", label: "Escalation" }] }] },
    { id: "s-im", role: "impacts", heading: "Impacts", level: 1, blocks: [{ id: "b3", type: "paragraph", text: "Impact assessment." }] },
    { id: "s-nu", role: "next_update", heading: "Next Update", level: 1, blocks: [{ id: "b4", type: "paragraph", text: "1800Z." }] }
  ];
  return r;
})();

valids["V4-policy-paper"] = (() => {
  const r = baseRequest();
  r.document.docType = "policy_paper";
  r.document.sections = [
    { id: "s-su", role: "summary", heading: "Summary", level: 1, blocks: [{ id: "b1", type: "paragraph", text: "Summary." }] },
    { id: "s-pr", role: "problem", heading: "Problem", level: 1, blocks: [{ id: "b2", type: "paragraph", text: "Problem." }] },
    { id: "s-ev", role: "evidence", heading: "Evidence", level: 1, blocks: [{ id: "b3", type: "paragraph", text: "Evidence.", style: "normal" }, { id: "b3r", type: "reference", citeId: "c1" }] },
    { id: "s-oa", role: "options_analysis", heading: "Options Analysis", level: 1,
      blocks: [{ id: "b4", type: "table", columns: [{ key: "o", label: "Option" }], rows: [[{ text: "A" }]] }] },
    { id: "s-rec", role: "recommendation", heading: "Recommendation", level: 1, blocks: [{ id: "b5", type: "paragraph", text: "Adopt A." }] }
  ];
  r.document.citations = [{ id: "c1", type: "dataset", title: "Dataset X", url: "https://example.org/x" }];
  return r;
})();

valids["V5-emergency-ai-service"] = (() => {
  const r = baseRequest();
  r.source = { system: "emergency-ai", tenantId: "11111111-1111-4111-8111-111111111111", correlationId: "job-7788" };
  r.delivery.ttlSeconds = 300;
  return r;
})();

// ---------------- INVALID ----------------
const invalids = {};
function inv(name, expect, mutate) { const r = baseRequest(); mutate(r); invalids[name] = { _expect: expect, request: r }; }

inv("I1-missing-title", "SCHEMA_INVALID", (r) => { delete r.document.metadata.title; });
inv("I2-bad-ddmVersion", "SCHEMA_INVALID", (r) => { r.document.ddmVersion = "0.9"; });
inv("I3-bare-string-cell", "SCHEMA_INVALID", (r) => {
  r.document.sections[2].blocks.push({ id: "bx", type: "table", columns: [{ key: "a", label: "A" }], rows: [["x"]] });
});
inv("I4-chart-extra-key", "SCHEMA_INVALID", (r) => {
  r.document.sections[2].blocks.push({ id: "bc", type: "chart", chartType: "bar",
    spec: { series: [{ key: "v", label: "V" }], data: [{ v: 1 }], transforms: [] } });
});
inv("I5-missing-recommendation-role", "SCAFFOLD_INCOMPLETE", (r) => {
  r.document.sections = r.document.sections.filter((s) => s.role !== "recommendation");
});
inv("I6-unresolved-citeref", "UNRESOLVED_REF", (r) => {
  r.document.sections[2].blocks.push({ id: "br", type: "reference", citeId: "zzz" });
});
inv("I7-image-no-alttext", "SCHEMA_INVALID", (r) => {
  r.document.sections[2].blocks.push({ id: "bi", type: "image", src: "https://x/y.png" });
});
inv("I8-sync-mode", "SCHEMA_INVALID", (r) => { r.delivery.mode = "sync"; });
inv("I9-package-set", "SCHEMA_INVALID", (r) => { r.package = "board_pack"; });
inv("I10-too-many-blocks", "DOC_TOO_LARGE", (r) => {
  // Stay within schema limits (<=80 sections, <=400 blocks/section) but exceed the
  // AGGREGATE block budget (400 total) which JSON Schema cannot express -> DOC_TOO_LARGE.
  const mkBlocks = (n, p) => Array.from({ length: n }, (_, i) => ({ id: `${p}${i}`, type: "paragraph", text: "x" }));
  r.document.sections = [
    { id: "s-sum", role: "executive_summary", heading: "Executive Summary", level: 1, blocks: mkBlocks(150, "a") },
    { id: "s-kj", role: "key_judgements", heading: "Key Judgements", level: 1, blocks: mkBlocks(150, "b") },
    { id: "s-an", role: "analysis", heading: "Analysis", level: 1, blocks: mkBlocks(120, "c") },
    { id: "s-rec", role: "recommendation", heading: "Recommendation", level: 1,
      blocks: [{ id: "rec1", type: "callout", style: "recommendation", text: "Proceed." }] }
  ]; // 421 blocks > 400 aggregate budget
});
inv("I11-bad-idempotency-key", "SCHEMA_INVALID", (r) => { r.idempotencyKey = "not-a-uuid"; });
inv("I12-output-pptx", "SCHEMA_INVALID", (r) => { r.outputs = ["pptx"]; });
inv("I13-ttl-too-small", "SCHEMA_INVALID", (r) => { r.delivery.ttlSeconds = 60; });
inv("I14-unknown-block-type", "SCHEMA_INVALID", (r) => {
  r.document.sections[2].blocks.push({ id: "bm", type: "map", text: "x" });
});
inv("I15-callbackauth-without-url", "CALLBACK_URL_REQUIRED", (r) => {
  r.delivery.callbackAuth = { type: "hmac" }; // no callbackUrl
});

for (const [k, v] of Object.entries(valids)) writeFileSync(join(VALID, `${k}.json`), JSON.stringify(v, null, 2));
for (const [k, v] of Object.entries(invalids)) writeFileSync(join(INVALID, `${k}.json`), JSON.stringify(v, null, 2));

console.log(`wrote ${Object.keys(valids).length} valid + ${Object.keys(invalids).length} invalid fixtures`);
