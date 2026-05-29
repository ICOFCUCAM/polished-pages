// Epic 1 acceptance test: all valid fixtures pass; all invalid fixtures fail
// with the expected primary error code. Also asserts /validate ≡ worker parity
// (validateRequest on the envelope vs validateDocument on the inner DDM).
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateRequest, validateDocument } from "../src/validator.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const VALID = join(__dir, "..", "fixtures", "valid");
const INVALID = join(__dir, "..", "fixtures", "invalid");

let pass = 0, fail = 0;
const log = (ok, msg) => { if (ok) { pass++; console.log(`  PASS ${msg}`); } else { fail++; console.log(`  FAIL ${msg}`); } };

console.log("== VALID fixtures (must be valid) ==");
for (const f of readdirSync(VALID).sort()) {
  const req = JSON.parse(readFileSync(join(VALID, f), "utf8"));
  const res = validateRequest(req);
  log(res.valid, `${f} → valid=${res.valid}${res.valid ? "" : " errors=" + JSON.stringify(res.errors)}`);
  // parity: inner-document validation must also pass for valid requests
  const doc = validateDocument(req.document);
  log(doc.valid, `${f} (worker parity) → doc.valid=${doc.valid}`);
}

console.log("== INVALID fixtures (must fail with expected code) ==");
for (const f of readdirSync(INVALID).sort()) {
  const { _expect, request } = JSON.parse(readFileSync(join(INVALID, f), "utf8"));
  const res = validateRequest(request);
  const codes = res.errors.map((e) => e.code);
  const ok = !res.valid && codes.includes(_expect);
  log(ok, `${f} → expected ${_expect}, got [${codes.join(",")}]`);
}

console.log(`\nTOTAL: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
