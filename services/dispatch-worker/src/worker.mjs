// dispatch-worker — Sprint 1 skeleton (M7).
// Proves the operational backbone WITHOUT rendering:
//   claim (SKIP LOCKED) -> lease -> running -> [stub: no render] -> succeeded
//   + retry framework, callback framework, status transitions, audit trail.
// The render seam is a clearly-marked stub (Sprint 2 plugs in engine + renderers).
import crypto from "node:crypto";
import { makePool, withClaims, writeAudit } from "../../shared/src/db.mjs";

const WORKER_ID = process.env.WORKER_ID || `worker-${crypto.randomUUID().slice(0, 8)}`;
const pool = makePool();
const sys = (tenantId, fn) => withClaims(pool, { tenant_id: tenantId, dispatch_role: "service", principal_type: "service", actor: WORKER_ID }, fn);

// Claim a single queued job atomically across N workers (FOR UPDATE SKIP LOCKED).
// Runs as service principal; lease via locked_at, reclaimable after 5 min.
async function claimOne() {
  // Cross-tenant atomic claim via SECURITY DEFINER (Epic 4). Per-job work below
  // runs under the claimed job's own tenant claim (normal RLS).
  return withClaims(pool, { principal_type: "system", dispatch_role: "service", actor: WORKER_ID }, async (client) => {
    const r = await client.query("select * from dispatch.claim_next_job($1)", [WORKER_ID]);
    const row = r.rows[0];
    return row && row.id ? row : null;
  });
}

async function setProgress(job, progress) {
  await sys(job.tenant_id, (c) => c.query("update dispatch.jobs set progress=$2, updated_at=now() where id=$1", [job.id, progress]));
}

async function finish(job, state, { result = null, error = null } = {}) {
  await sys(job.tenant_id, async (client) => {
    await client.query("update dispatch.jobs set state=$2, progress=$3, result=$4, error=$5, locked_at=null, updated_at=now() where id=$1",
      [job.id, state, state === "succeeded" ? 100 : job.progress, result ? JSON.stringify(result) : null, error ? JSON.stringify(error) : null]);
    const docStatus = state === "succeeded" || state === "partial" ? "complete" : state === "failed" ? "failed" : "rendering";
    if (job.document_id) await client.query("update dispatch.documents set status=$2 where id=$1", [job.document_id, docStatus]);
    await writeAudit(client, { tenantId: job.tenant_id, actor: WORKER_ID, actorType: "service",
      action: `render.${state}`, targetType: "job", targetId: job.id, requestId: job.request_id, correlationId: job.correlation_id });
  });
  await deliverCallback(job, state, result, error);
}

async function requeueWithBackoff(job, errMsg) {
  const attempts = job.attempts; // already incremented at claim
  if (attempts >= job.max_attempts) {
    // DLQ + fail (poison/exhausted)
    await sys(job.tenant_id, async (client) => {
      await client.query("insert into dispatch.job_dlq (tenant_id, job_id, reason, payload) values ($1,$2,$3,$4)",
        [job.tenant_id, job.id, errMsg.slice(0, 500), JSON.stringify({ outputs: job.outputs, version_id: job.version_id })]);
    });
    await finish(job, "failed", { error: { code: "ENGINE_ERROR", message: errMsg } });
    return;
  }
  const backoffS = 2 ** attempts; // 2,4,8...
  await sys(job.tenant_id, (c) => c.query(
    "update dispatch.jobs set state='queued', locked_at=null, next_visible_at=now() + ($2 || ' seconds')::interval, updated_at=now() where id=$1",
    [job.id, String(backoffS)]));
}

// Callback framework: HMAC-signed POST; retried by the worker loop in production.
// Sprint 1 records the attempt + signs the body; delivery is best-effort.
async function deliverCallback(job, state, result, error) {
  if (!job.callback_url) return;
  const payload = JSON.stringify({ schemaVersion: "1.0", requestId: job.request_id, jobId: job.id, status: state,
    engineVersion: "dispatch-worker@1.0.0-sprint1", artifacts: [], warnings: [], error });
  // Secret resolved from service_clients.callback_secret_ref in production; Sprint 1
  // uses an env shim so the signature path is exercised end-to-end.
  const secret = process.env.CALLBACK_HMAC_SECRET || "sprint1-dev-secret";
  const sig = "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
  await sys(job.tenant_id, (c) => c.query(
    `insert into dispatch.audit_events (tenant_id, actor, actor_type, action, target_type, target_id, request_id, correlation_id)
     values ($1,$2,'service','callback.attempted','job',$3,$4,$5)`,
    [job.tenant_id, WORKER_ID, job.id, job.request_id, job.correlation_id]));
  try {
    const u = new URL(job.callback_url);
    const mod = u.protocol === "https:" ? await import("node:https") : await import("node:http");
    await new Promise((resolve) => {
      const r = mod.request(u, { method: "POST", headers: { "content-type": "application/json",
        "x-dispatch-signature": sig, "x-dispatch-timestamp": String(Math.floor(Date.now() / 1000)), "x-dispatch-delivery": crypto.randomUUID() } }, (resp) => { resp.resume(); resolve(); });
      r.on("error", () => resolve()); // delivery failure does not fail the job
      r.end(payload);
    });
  } catch { /* best-effort in Sprint 1 */ }
}

// ----- the render seam (STUB — Sprint 2 inserts Dispatch Engine + renderers) -----
async function processJob(job) {
  await setProgress(job, 30);
  // SPRINT 1: no rendering. We simulate a successful no-op render so the backbone
  // (status progression + audit) is exercised. Artifacts intentionally empty.
  if (process.env.FORCE_FAIL_TRANSIENT === job.id) throw new Error("forced transient fault (test)");
  await setProgress(job, 70);
  await finish(job, "succeeded", { artifacts: [], note: "sprint1-stub: no render performed" });
}

async function tick() {
  const job = await claimOne();
  if (!job) return false;
  try {
    await processJob(job);
  } catch (e) {
    await requeueWithBackoff(job, String(e.message));
  }
  return true;
}

async function loop() {
  console.log(`${WORKER_ID} polling…`);
  // Single-pass or continuous based on env (tests use RUN_ONCE).
  if (process.env.RUN_ONCE) { let n = 0; while (await tick()) n++; console.log(`processed ${n} job(s)`); await pool.end(); return; }
  // eslint-disable-next-line no-constant-condition
  while (true) { const did = await tick(); if (!did) await new Promise((r) => setTimeout(r, 1000)); }
}

// Only run the loop when executed directly (not when imported by tests).
import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  loop().catch((e) => { console.error("worker fatal:", e); process.exit(1); });
}

export { claimOne, tick, pool };
