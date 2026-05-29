// Sprint 1 retry/DLQ framework test: a job forced to fail transiently is
// requeued with backoff up to max_attempts, then moved to job_dlq + failed.
import pgpkg from "pg";
import crypto from "node:crypto";
import { makePool, withClaims } from "../shared/src/db.mjs";

const TENANT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const pool = makePool();
const admin = new pgpkg.Pool({ host: process.env.PGHOST || "/tmp", port: Number(process.env.PGPORT || 55432), user: "postgres", database: "dispatch", max: 3 });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  PASS ${m}`); } else { fail++; console.log(`  FAIL ${m}`); } };

// Insert a job directly (as service) with a tiny version, force the worker stub to fail.
async function seedJob() {
  return withClaims(pool, { tenant_id: TENANT_A, dispatch_role: "service", principal_type: "service", actor: "retry-test" }, async (c) => {
    const d = await c.query("insert into dispatch.documents (tenant_id, doc_type, status, source_system) values ($1,'executive_briefing','rendering','internal') returning id", [TENANT_A]);
    const v = await c.query("insert into dispatch.document_versions (tenant_id, document_id, version_no, ddm, ddm_version) values ($1,$2,1,'{}'::jsonb,'1.0') returning id", [TENANT_A, d.rows[0].id]);
    const j = await c.query("insert into dispatch.jobs (tenant_id, document_id, version_id, request_id, idempotency_key, lane, outputs, max_attempts, state) values ($1,$2,$3,$4,$5,'service',array['pdf'],3,'queued') returning id",
      [TENANT_A, d.rows[0].id, v.rows[0].id, crypto.randomUUID(), crypto.randomUUID()]);
    return j.rows[0].id;
  });
}

async function main() {
  console.log("== Sprint 1 retry/DLQ framework ==");
  const jobId = await seedJob();
  process.env.FORCE_FAIL_TRANSIENT = jobId;     // worker stub throws for this id
  // Re-import worker fresh so it reads the env (module caches tick).
  const { tick } = await import("../dispatch-worker/src/worker.mjs?retry=" + Date.now());

  // Drive ticks; each claim increments attempts. Reset next_visible_at between
  // ticks so backoff doesn't stall the test.
  let states = [];
  for (let i = 0; i < 4; i++) {
    await admin.query("update dispatch.jobs set next_visible_at = now() where id=$1", [jobId]);
    await tick();
    const r = await admin.query("select state, attempts from dispatch.jobs where id=$1", [jobId]);
    states.push(`${r.rows[0].state}/att${r.rows[0].attempts}`);
  }
  console.log("   transitions:", states.join(" -> "));

  const finalJob = (await admin.query("select state, attempts from dispatch.jobs where id=$1", [jobId])).rows[0];
  ok(finalJob.state === "failed", `job ends failed after exhausting retries (attempts=${finalJob.attempts})`);
  const dlq = (await admin.query("select count(*)::int n from dispatch.job_dlq where job_id=$1", [jobId])).rows[0].n;
  ok(dlq === 1, "job moved to job_dlq with replay payload");
  const aud = (await admin.query("select count(*)::int n from dispatch.audit_events where target_id=$1 and action='render.failed'", [jobId])).rows[0].n;
  ok(aud === 1, "audit: render.failed written");

  console.log(`\nTOTAL: ${pass} passed, ${fail} failed`);
  await pool.end(); await admin.end();
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(2); });
