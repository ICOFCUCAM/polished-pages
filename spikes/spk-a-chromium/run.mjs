// SPK-A: prove a headless Chromium worker renders an Executive-Briefing HTML to a
// valid, multi-page PDF with chrome (cover/banners/header/footer/page-numbers/table),
// compute sha256, and demonstrate determinism across 3 runs.
//
// Drives the headless_shell binary directly (no network download) — the same
// mechanism a dispatch-worker container would use.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const HTML = join(__dir, "briefing.html");

// Locate a headless Chromium shell shipped in the environment.
const CANDIDATES = [
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
];
const BIN = CANDIDATES.find(existsSync);
if (!BIN) { console.error("FAIL: no chromium binary found in", CANDIDATES); process.exit(2); }

function sha256(buf) { return createHash("sha256").update(buf).digest("hex"); }

function render(outPath) {
  execFileSync(BIN, [
    "--headless", "--no-sandbox", "--disable-gpu",
    "--no-pdf-header-footer",          // we supply our own via @page CSS
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=2000",
    `--print-to-pdf=${outPath}`,
    `file://${HTML}`,
  ], { stdio: ["ignore", "ignore", "pipe"] });
}

function pdfPageCount(buf) {
  // Count "/Type /Page" occurrences (sufficient for spike evidence).
  const s = buf.toString("latin1");
  const m = s.match(/\/Type\s*\/Page[^s]/g);
  return m ? m.length : null;
}

const t0 = Date.now();
const out1 = join(__dir, "out-1.pdf");
render(out1);
const warmStart = Date.now();
const out2 = join(__dir, "out-2.pdf");
render(out2);
const out3 = join(__dir, "out-3.pdf");
render(out3);
const warmMs = Math.round((Date.now() - warmStart) / 2);

const b1 = readFileSync(out1), b2 = readFileSync(out2), b3 = readFileSync(out3);
const h1 = sha256(b1), h2 = sha256(b2), h3 = sha256(b3);

const isPdf = b1.slice(0, 5).toString() === "%PDF-";
const pages = pdfPageCount(b1);
// Determinism: Chromium embeds a /CreationDate, so raw bytes differ by timestamp.
// Normalise by stripping the PDF date strings, then compare — this models the
// PDF/A timestamp-normalisation the real sealer will apply.
function normalize(buf) {
  return buf.toString("latin1").replace(/\/(CreationDate|ModDate)\s*\(D:[^)]*\)/g, "/$1 (D:NORMALIZED)");
}
const n1 = sha256(Buffer.from(normalize(b1), "latin1"));
const n2 = sha256(Buffer.from(normalize(b2), "latin1"));
const n3 = sha256(Buffer.from(normalize(b3), "latin1"));
const deterministic = n1 === n2 && n2 === n3;

const evidence = {
  spike: "SPK-A",
  generatedAt: new Date().toISOString(),
  chromiumBinary: BIN,
  artifact: { path: out1, sizeBytes: statSync(out1).size, isPdf, pages, sha256: h1 },
  determinism: {
    rawSha: [h1, h2, h3],
    normalizedSha: [n1, n2, n3],
    deterministicAfterTimestampNormalization: deterministic,
  },
  performance: { warmRenderMsApprox: warmMs, totalMs: Date.now() - t0 },
  checks: {
    "produces valid PDF": isPdf,
    "multi-page (>=2: cover+toc+body)": (pages || 0) >= 2,
    "non-empty artifact": statSync(out1).size > 1000,
    "deterministic (normalized)": deterministic,
  },
};

writeFileSync(join(__dir, "EVIDENCE.json"), JSON.stringify(evidence, null, 2));
const allPass = Object.values(evidence.checks).every(Boolean);
console.log(JSON.stringify(evidence, null, 2));
console.log(allPass ? "\nSPK-A: ALL CHECKS PASS" : "\nSPK-A: CHECKS FAILED");
process.exit(allPass ? 0 : 1);
