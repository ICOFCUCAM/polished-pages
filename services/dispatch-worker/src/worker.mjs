// dispatch-worker — operational backbone + render seam (Sprint 1 M7 + Sprint 2 Epic 5/6).
//   claim (SKIP LOCKED) -> lease -> running -> render(LM → outputs) -> store -> succeeded
//   + retry framework, callback framework, status transitions, audit trail.
// Sprint 2: the render seam now builds the Layout Model (Epic 5) and renders per
// output. Markdown is live (proves the full spine); pdf/docx are declared but not
// yet implemented (Epics 6/7) — requesting them yields a per-output failure →
// `partial` when another output succeeds, isolating the unbuilt formats.
import crypto from "node:crypto";
import { makePool, withClaims, writeAudit } from "../../shared/src/db.mjs";
import { putArtifact, signUrl, artifactKey } from "../../shared/src/storage.mjs";
import { buildLayout, ENGINE_VERSION, EngineError } from "@dispatch/ddm-schema/engine";
import { renderMarkdown } from "@dispatch/ddm-schema/render-md";

const WORKER_ID = process.env.WORKER_ID || `worker-${crypto.randomUUID().slice(0, 8)}`;
const pool = makePool();

// Per-output renderers (LM → bytes). Each returns { ext, bytes, warnings } or
// throws. PDF/DOCX are Epics 6/7 — declared as not-yet-implemented so requests
// for them isolate to a per-output failure rather than failing the whole job.
const RENDERERS = {
  md: (lm) => { const { text, warnings } = renderMarkdown(lm); return { ext: "md", bytes: Buffer.from(text, "utf8"), warnings }; },
  pdf: () => { const e = new Error("pdf renderer not yet implemented (Epic 6)"); e.deterministic = true; throw e; },
  docx: () => { const e = new Error("docx renderer not yet implemented (Epic 7)"); e.deterministic = true; throw e; },
};
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

async function finish(job, state, { artifacts = [], warnings = [], error = null, engineVersion = null, templateBinding = null, renderLog = null } = {}) {
  // Persisted job.result is a DocumentResult-shaped snapshot (Epic 1 contract).
  const result = {
    schemaVersion: "1.0", requestId: job.request_id, jobId: job.id, status: state,
    engineVersion: engineVersion || `dispatch-worker@1.0.0`,
    templateBinding, artifacts, warnings, error,
    renderLog: renderLog || { blocksRendered: 0, pages: null },
  };
  await sys(job.tenant_id, async (client) => {
    await client.query("update dispatch.jobs set state=$2, progress=$3, result=$4, error=$5, locked_at=null, updated_at=now() where id=$1",
      [job.id, state, state === "succeeded" ? 100 : job.progress, JSON.stringify(result), error ? JSON.stringify(error) : null]);
    const docStatus = state === "succeeded" || state === "partial" ? "complete" : state === "failed" ? "failed" : "rendering";
    if (job.document_id) await client.query("update dispatch.documents set status=$2 where id=$1", [job.document_id, docStatus]);
    await writeAudit(client, { tenantId: job.tenant_id, actor: WORKER_ID, actorType: "service",
      action: `render.${state}`, targetType: "job", targetId: job.id, requestId: job.request_id, correlationId: job.correlation_id });
  });
  await deliverCallback(job, result);
}

async function requeueWithBackoff(job, errMsg) {
  const attempts = job.attempts; // already incremented at claim
  if (attempts >= job.max_attempts) {
    // DLQ + fail (poison/exhausted)
    await sys(job.tenant_id, async (client) => {
      await client.query("insert into dispatch.job_dlq (tenant_id, job_id, reason, payload) values ($1,$2,$3,$4)",
        [job.tenant_id, job.id, errMsg.slice(0, 500), JSON.stringify({ outputs: job.outputs, version_id: job.version_id })]);
    });
    await finish(job, "failed", { error: { code: "ENGINE_ERROR", message: errMsg }, engineVersion: ENGINE_VERSION });
    return;
  }
  const backoffS = 2 ** attempts; // 2,4,8...
  await sys(job.tenant_id, (c) => c.query(
    "update dispatch.jobs set state='queued', locked_at=null, next_visible_at=now() + ($2 || ' seconds')::interval, updated_at=now() where id=$1",
    [job.id, String(backoffS)]));
}

// Callback framework: HMAC-signed POST; retried by the worker loop in production.
// Sprint 1 records the attempt + signs the body; delivery is best-effort.
async function deliverCallback(job, result) {
  if (!job.callback_url) return;
  const payload = JSON.stringify(result); // full DocumentResult (artifacts incl. signed URLs)
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

// ----- the render seam (Epic 5 engine + per-output renderers) -----
// Load the immutable DDM for a job's version, build the Layout Model, render each
// requested output independently, store artifacts. Per-output isolation: one
// output failing does not abort the others → job becomes `partial`.
async function loadVersion(job) {
  return sys(job.tenant_id, async (client) => {
    const r = await client.query(
      "select dv.ddm, d.id as document_id from dispatch.document_versions dv join dispatch.documents d on d.id = dv.document_id where dv.id = $1",
      [job.version_id]);
    return r.rows[0] || null;
  });
}

async function insertArtifact(job, art) {
  await sys(job.tenant_id, (c) => c.query(
    `insert into dispatch.artifacts (tenant_id, version_id, job_id, role, format, storage_ref, sha256, size_bytes, classification, expires_at)
     values ($1,$2,$3,'primary',$4,$5,$6,$7,$8, now() + interval '7 days')
     on conflict (version_id, format, role) do update set storage_ref=excluded.storage_ref, sha256=excluded.sha256, size_bytes=excluded.size_bytes
     returning id`,
    [job.tenant_id, job.version_id, job.id, art.format, art.storageRef, art.sha256, art.sizeBytes, art.classification]));
}

async function processJob(job) {
  await setProgress(job, 10);
  // Transient-fault test hook (unchanged from Sprint 1).
  if (process.env.FORCE_FAIL_TRANSIENT === job.id) throw new Error("forced transient fault (test)");

  const ver = await loadVersion(job);
  if (!ver) { const e = new Error("document version not found"); e.deterministic = true; throw e; }

  // Epic 5: build the Layout Model. EngineError = deterministic → fail (no retry).
  let lm;
  try {
    lm = buildLayout(ver.ddm, { engineVersion: ENGINE_VERSION });
  } catch (e) {
    if (e instanceof EngineError) {
      await finish(job, "failed", { error: { code: e.code, message: e.message } });
      return;
    }
    throw e; // unexpected → transient path
  }
  await setProgress(job, 30);

  const classification = lm.classification?.level || null;
  const outputs = job.outputs || [];
  const artifacts = [];
  const warnings = [...(lm.warnings || [])];
  const failures = [];

  // Render each requested output independently.
  let i = 0;
  for (const fmt of outputs) {
    const renderer = RENDERERS[fmt];
    try {
      if (!renderer) { const e = new Error(`unsupported output '${fmt}'`); e.deterministic = true; throw e; }
      const out = renderer(lm);
      for (const w of out.warnings || []) warnings.push(w);
      const artifactId = crypto.randomUUID();
      const key = artifactKey({ tenantId: job.tenant_id, documentId: ver.document_id, versionId: job.version_id, artifactId, ext: out.ext });
      const stored = await putArtifact(key, out.bytes);
      await insertArtifact(job, { format: fmt, ...stored, classification });
      const { url, expiresAt } = signUrl(key);
      artifacts.push({ artifactId, role: "primary", format: fmt, sizeBytes: stored.sizeBytes, pages: null,
        sha256: stored.sha256, classification, storage: "signed_url", url, expiresAt });
    } catch (e) {
      failures.push({ code: "RENDER_FAILED", message: `${fmt}: ${e.message}`, field: null });
    }
    i += 1;
    await setProgress(job, 30 + Math.round((i / Math.max(outputs.length, 1)) * 50));
  }

  await setProgress(job, 85);
  const state = artifacts.length === 0 ? "failed" : failures.length ? "partial" : "succeeded";
  const error = failures.length ? failures[0] : null;
  await finish(job, state, { artifacts, warnings, error, engineVersion: ENGINE_VERSION,
    templateBinding: lm.templateBinding, renderLog: { blocksRendered: countBlocks(lm), pages: null } });
}

function countBlocks(lm) {
  const all = [...(lm.body || []), ...(lm.appendices || [])];
  return all.reduce((n, s) => n + (s.blocks ? s.blocks.length : 0), 0);
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
