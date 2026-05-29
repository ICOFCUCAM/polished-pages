// Sprint 1 end-to-end backbone test.
// Proves: Contract -> Validation -> DB (document+version) -> Job -> Worker claim
// -> status progression -> Audit trail. Plus negative cases. NO rendering.
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import pg from "node:process";
import pgpkg from "pg";
import { makePool, withClaims } from "../shared/src/db.mjs";
import { tick } from "../dispatch-worker/src/worker.mjs";

const API = "http://127.0.0.1:8787";
const TENANT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TENANT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const pool = makePool();
// Out-of-band inspector connection (superuser) — tests legitimately verify DB
// state directly, including append-only audit which has no app SELECT policy.
const adminPool = new pgpkg.Pool({ host: process.env.PGHOST || "/tmp", port: Number(process.env.PGPORT || 55432),
  user: "postgres", database: process.env.PGDATABASE || "dispatch", max: 3 });

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  PASS ${m}`); } else { fail++; console.log(`  FAIL ${m}`); } };

function execBriefing(tenantId, title = "Regional Stability Brief") {
  return {
    schemaVersion: "1.0", idempotencyKey: crypto.randomUUID(),
    source: { system: "emergency-ai", tenantId, correlationId: "job-7788" },
    document: {
      ddmVersion: "1.0", docType: "executive_briefing",
      metadata: { title, date: "2026-05-29", status: "final" },
      classification: { scheme: "none", level: "UNCLASSIFIED" },
      sections: [
        { id: "s-sum", role: "executive_summary", heading: "Executive Summary", level: 1, blocks: [{ id: "b1", type: "paragraph", text: "BLUF.", style: "lead" }] },
        { id: "s-kj", role: "key_judgements", heading: "Key Judgements", level: 1, blocks: [{ id: "b2", type: "bullets", ordered: true, items: [{ text: "J1" }] }] },
        { id: "s-an", role: "analysis", heading: "Analysis", level: 1, blocks: [{ id: "b3", type: "paragraph", text: "Body." }] },
        { id: "s-rec", role: "recommendation", heading: "Recommendation", level: 1, blocks: [{ id: "b4", type: "callout", style: "recommendation", text: "Proceed." }] }
      ]
    },
    outputs: ["md"],   // Sprint 2: md renderer is live end-to-end (pdf/docx = Epics 6/7)
    delivery: { mode: "async", storage: "signed_url", ttlSeconds: 604800 }
  };
}

async function api(path, { token, idem, body } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers["authorization"] = "Bearer " + token;
  if (idem) headers["idempotency-key"] = idem;
  const r = await fetch(API + path, { method: "POST", headers, body: JSON.stringify(body) });
  let json = null; try { json = await r.json(); } catch {}
  return { status: r.status, json };
}

async function countAudit(tenantId, action, targetId) {
  // append-only audit has no app SELECT policy -> verify via admin inspector.
  const r = await adminPool.query("select count(*)::int n from dispatch.audit_events where tenant_id=$1 and action=$2 and ($3::uuid is null or target_id=$3)", [tenantId, action, targetId || null]);
  return r.rows[0].n;
}
async function jobState(tenantId, jobId) {
  return withClaims(pool, { tenant_id: tenantId, dispatch_role: "service", principal_type: "service", actor: "test" }, async (c) => {
    const r = await c.query("select state, progress from dispatch.jobs where id=$1", [jobId]);
    return r.rows[0];
  });
}

async function main() {
  console.log("== Sprint 1 E2E backbone ==");

  // 1. validate (valid)
  const tokA = "svc svc-a:secret-A";
  const v = await api("/v1/validate", { token: tokA, body: execBriefing(TENANT_A) });
  ok(v.status === 200 && v.json.valid === true, `validate valid exec-briefing -> 200 valid=true (warnings=${v.json?.warnings?.length})`);

  // 2. validate (invalid: drop recommendation)
  const bad = execBriefing(TENANT_A); bad.document.sections = bad.document.sections.filter(s => s.role !== "recommendation");
  const v2 = await api("/v1/validate", { token: tokA, body: bad });
  ok(v2.status === 200 && v2.json.valid === false && v2.json.errors.some(e => e.code === "SCAFFOLD_INCOMPLETE"), "validate missing recommendation -> valid=false SCAFFOLD_INCOMPLETE");

  // 3. submit (valid) -> 202 + job
  const req = execBriefing(TENANT_A);
  const idem = req.idempotencyKey;
  const sub = await api("/v1/documents", { token: tokA, idem, body: req });
  ok(sub.status === 202 && sub.json.jobId, `submit -> 202 jobId=${sub.json?.jobId?.slice(0,8)} status=${sub.json?.status}`);
  const jobId = sub.json.jobId;

  // 4. document.submitted audit present
  ok((await countAudit(TENANT_A, "document.submitted", jobId)) === 1, "audit: document.submitted written");

  // 5. idempotency replay (same key+body) -> same jobId
  const sub2 = await api("/v1/documents", { token: tokA, idem, body: req });
  ok(sub2.status === 202 && sub2.json.jobId === jobId && sub2.json.replay === true, "idempotent replay -> same jobId, replay=true");

  // 6. missing idempotency key -> 400
  const sub3 = await api("/v1/documents", { token: tokA, body: execBriefing(TENANT_A) });
  ok(sub3.status === 400 && sub3.json.error.code === "IDEMPOTENCY_KEY_REQUIRED", "missing Idempotency-Key -> 400");

  // 7. tenant mismatch (token A, body claims tenant B) -> 403
  const mm = execBriefing(TENANT_B);
  const sub4 = await api("/v1/documents", { token: tokA, idem: crypto.randomUUID(), body: mm });
  ok(sub4.status === 403 && sub4.json.error.code === "TENANT_MISMATCH", "tenant mismatch -> 403 TENANT_MISMATCH");

  // 8. bad service secret -> 401
  const sub5 = await api("/v1/validate", { token: "svc svc-a:WRONG", body: execBriefing(TENANT_A) });
  ok(sub5.status === 401 && sub5.json.error.code === "INVALID_CLIENT", "bad service secret -> 401 INVALID_CLIENT");

  // 9. worker claims the queued job -> progression -> succeeded
  const before = await jobState(TENANT_A, jobId);
  const claimed = await tick();           // single worker pass
  const after = await jobState(TENANT_A, jobId);
  ok(claimed === true, "worker claimed a job (SKIP LOCKED)");
  ok(before.state === "queued" && after.state === "succeeded" && after.progress === 100, `status progression queued -> ${after.state} (progress ${after.progress})`);

  // 10. render.succeeded audit present
  ok((await countAudit(TENANT_A, "render.succeeded", jobId)) === 1, "audit: render.succeeded written");

  // 10b. Sprint 2: a real md artifact was produced + stored with a checksum.
  const art = await adminPool.query("select format, sha256, size_bytes from dispatch.artifacts where job_id=$1", [jobId]);
  ok(art.rows.length === 1 && art.rows[0].format === "md" && /^[a-f0-9]{64}$/.test(art.rows[0].sha256) && art.rows[0].size_bytes > 0,
     `md artifact stored (sha256, ${art.rows[0]?.size_bytes ?? 0} bytes)`);

  // 11. version persisted + immutable. RLS has no UPDATE policy (silently 0 rows)
  // AND the immutability trigger blocks privileged mutation. Verify the row is
  // genuinely unchanged after an attempted tamper as the superuser inspector
  // (which is subject to the BEFORE UPDATE trigger -> must raise).
  const vr = await adminPool.query("select dv.id, dv.ddm from dispatch.document_versions dv join dispatch.jobs j on j.version_id=dv.id where j.id=$1", [jobId]);
  let immutable = "no-version";
  if (vr.rows[0]) {
    try { await adminPool.query("update dispatch.document_versions set ddm='{}'::jsonb where id=$1", [vr.rows[0].id]); immutable = "MUTATED"; }
    catch { immutable = "blocked"; }
  }
  ok(immutable === "blocked", "document_versions immutable (trigger blocks UPDATE even for superuser inspector)");

  // 12. cross-tenant read isolation: tenant B cannot see tenant A's job
  const cross = await withClaims(pool, { tenant_id: TENANT_B, dispatch_role: "author", principal_type: "user", actor: "test" }, async (c) => {
    const r = await c.query("select count(*)::int n from dispatch.jobs where id=$1", [jobId]); return r.rows[0].n;
  });
  ok(cross === 0, "cross-tenant isolation: tenant B cannot see tenant A job");

  console.log(`\nTOTAL: ${pass} passed, ${fail} failed`);
  await pool.end();
  await adminPool.end();
  pg.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); pg.exit(2); });
