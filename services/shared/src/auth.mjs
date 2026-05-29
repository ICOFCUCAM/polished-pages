// Minimal Principal resolver (ADR-002). Sprint 1 supports two token kinds:
//  - service token:  "svc <client_id>:<secret>"  -> looked up in service_clients
//  - dev user token:  "user <tenantId>:<role>"    -> trusted dev shim (Supabase Auth later)
// Both resolve to a uniform Principal { tenantId, principalType, role, scopes, actor }.
// Production swaps these for verified JWTs without changing downstream code.
import crypto from "node:crypto";

// NOTE: Sprint 1 uses a sha256(secret) comparison for the dev harness. Production
// uses argon2/bcrypt (service_clients.secret_hash) — see ADR-002 / risk register.
export function hashSecret(secret) {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export async function resolvePrincipal(pool, authHeader, withClaimsAdmin) {
  if (!authHeader) return { error: { status: 401, code: "UNAUTHENTICATED", message: "missing Authorization" } };
  const [kind, rest] = authHeader.replace(/^Bearer\s+/i, "").split(/\s+/, 2);

  if (kind === "user") {
    const [tenantId, role] = (rest || "").split(":");
    if (!tenantId || !role) return { error: { status: 401, code: "UNAUTHENTICATED", message: "bad user token" } };
    return { principal: { tenantId, principalType: "user", role, scopes: roleScopes(role), actor: `user:${role}` } };
  }

  if (kind === "svc") {
    const [clientId, secret] = (rest || "").split(":");
    if (!clientId || !secret) return { error: { status: 401, code: "UNAUTHENTICATED", message: "bad service token" } };
    // service_clients lookup must bypass tenant RLS (we don't know the tenant yet):
    // do it as an admin/system claim.
    // SECURITY DEFINER lookup: resolves the client before the tenant is known
    // (cannot be tenant-RLS-scoped). Read-only, by client_id only.
    const row = await withClaimsAdmin(async (client) => {
      const r = await client.query("select * from dispatch.lookup_service_client($1)", [clientId]);
      return r.rows[0];
    });
    if (!row || !row.active) return { error: { status: 401, code: "INVALID_CLIENT", message: "unknown or inactive client" } };
    if (row.secret_hash !== hashSecret(secret)) return { error: { status: 401, code: "INVALID_CLIENT", message: "bad secret" } };
    return { principal: { tenantId: row.tenant_id, principalType: "service", role: "service", scopes: row.scopes, actor: `svc:${clientId}` } };
  }

  return { error: { status: 401, code: "UNAUTHENTICATED", message: "unknown token kind" } };
}

export function roleScopes(role) {
  switch (role) {
    case "viewer": return ["dispatch:read"];
    case "author":
    case "tenant_admin": return ["dispatch:validate", "dispatch:render", "dispatch:read"];
    default: return [];
  }
}

export function hasScope(principal, scope) {
  return Array.isArray(principal.scopes) && principal.scopes.includes(scope);
}
