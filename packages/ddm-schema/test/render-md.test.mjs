// Markdown renderer tests (Epic 6/7 sibling). LM → Markdown, presentation only.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildLayout } from "../src/engine.mjs";
import { renderMarkdown } from "../src/render-md.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const load = (f) => JSON.parse(readFileSync(join(__dir, "..", "fixtures", "valid", f), "utf8")).document;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  PASS ${m}`); } else { fail++; console.log(`  FAIL ${m}`); } };

console.log("== Markdown renderer ==");
const lm = buildLayout(load("V2-full-exec-briefing.json"));
const { text, warnings } = renderMarkdown(lm);

ok(text.startsWith("# Regional Stability Brief"), "cover H1 from metadata");
ok(text.includes("## Contents"), "TOC section rendered");
ok(/^## 1 Executive Summary/m.test(text), "numbered section heading (1 Executive Summary)");
ok(/^## 4 Recommendation/m.test(text), "recommendation numbered 4");
ok(/Appendix A — Methodology/.test(text), "appendix lettered A in heading");
ok(text.includes("| Option | Cost |"), "table rendered with columns");
ok(/\[\^1\]/.test(text), "citation marker [^1] present");
ok(/^\[\^1\]:/m.test(text), "sources endnote [^1]: present");
ok(text.includes("**[RISK]**"), "callout rendered with style label");
ok(text.includes("**[RECOMMENDATION]**"), "recommendation callout rendered");
ok(text.includes("Figure 1") || text.includes("Trend"), "chart rendered (as data table fallback)");
ok(warnings.some((w) => w.code === "CHART_RASTERIZED"), "chart fallback warning emitted");
ok(/!\[map of region\]/.test(text), "image rendered with altText");
ok(text.endsWith("\n"), "output ends with newline");

// Determinism
const t2 = renderMarkdown(buildLayout(load("V2-full-exec-briefing.json"))).text;
ok(t2 === text, "deterministic markdown output");

console.log(`\nTOTAL: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
