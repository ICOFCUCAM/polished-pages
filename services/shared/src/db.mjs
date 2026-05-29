// Shared DB access for dispatch-api and dispatch-worker.
// Every query runs inside a transaction that sets `request.jwt.claims` so RLS
// (ADR-003 / M2) applies to the app's own queries — identical path for user and
// service principals. The pool connects as the unprivileged `dispatch_app` role.
import pg from "pg";

const { Pool } = pg;

export function makePool() {
  return new Pool({
    host: process.env.PGHOST || "/tmp",
    port: Number(process.env.PGPORT || 55432),
    user: process.env.DISPATCH_DB_USER || "dispatch_app",
    database: process.env.PGDATABASE || "dispatch",
    max: Number(process.env.PG_POOL_MAX || 8),
  });
}

/**
 * Run `fn(client)` in a transaction with the JWT claims set for RLS.
 * claims = { tenant_id, dispatch_role, principal_type, actor }
 */
export async function withClaims(pool, claims, fn) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    // set_config(..., true) => transaction-local; mirrors PostgREST behaviour.
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims || {})]);
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (e) {
    try { await client.query("rollback"); } catch { /* ignore */ }
    throw e;
  } finally {
    client.release();
  }
}

export async function writeAudit(client, ev) {
  await client.query(
    `insert into dispatch.audit_events
       (tenant_id, actor, actor_type, action, target_type, target_id, classification, request_id, correlation_id, sha256)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [ev.tenantId, ev.actor, ev.actorType, ev.action, ev.targetType || null, ev.targetId || null,
     ev.classification || null, ev.requestId || null, ev.correlationId || null, ev.sha256 || null]
  );
}
