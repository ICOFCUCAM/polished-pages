// Principal resolver (ADR-002). Resolves a uniform Principal
//   { tenantId, principalType, role, scopes, actor }
// from the Authorization header. Returns { principal } or { error } (never throws),
// preserving the Sprint-1 contract so handlers and RLS are unchanged.
//
// R2 — Production authentication. Three accepted credentials:
//   1. "Bearer <jwt>"            production path. HS256-verified:
//        - service JWT (principal_type:"service") via DISPATCH_TOKEN_SECRET,
//          minted by POST /v1/token (client-credentials).
//        - user JWT (Supabase) via SUPABASE_JWT_SECRET; tenant from
//          app_metadata.tenant_id (or top-level tenant_id).
//   2. "svc <client_id>:<secret>"  client-credentials check (timing-safe compare
//        against service_clients.secret_hash). Used by /v1/token and, for
//        backward-compat, directly. The sha256-at-rest is a noted residual
//        (R-S1-1); the comparison is now constant-time.
//   3. "user <tenantId>:<role>"   DEV-ONLY trust shim. Disabled when
//        NODE_ENV=production or DISPATCH_ALLOW_DEV_TOKENS=0.
//
// The historical leading "Bearer " is stripped first (Sprint-1 tests wrap the
// svc/user tokens as "Bearer svc …"); a real JWT is detected as a single
// dot-delimited token.
import crypto from "node:crypto";
import { verifyJwt, signJwt, decodeUnverified, JwtError } from "./jwt.mjs";

const TENANT_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// NOTE: sha256(secret) compares the presented service secret against
// service_clients.secret_hash. Production should migrate the at-rest hash to
// argon2/bcrypt (residual R-S1-1); the *comparison* below is constant-time.
export function hashSecret(secret) {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

function timingSafeStrEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function devTokensAllowed() {
  if (process.env.DISPATCH_ALLOW_DEV_TOKENS === "0") return false;
  if (process.env.DISPATCH_ALLOW_DEV_TOKENS === "1") return true;
  return process.env.NODE_ENV !== "production"; // default on, except in production
}

export async function resolvePrincipal(pool, authHeader, withClaimsAdmin) {
  if (!authHeader) return { error: { status: 401, code: "UNAUTHENTICATED", message: "missing Authorization" } };
  const stripped = authHeader.replace(/^Bearer\s+/i, "");
  const [kind, rest] = stripped.split(/\s+/, 2);

  // ---- Production path: a real JWT (single dot-delimited token) -------------
  if (rest === undefined && kind.split(".").length === 3) {
    return resolveJwt(kind);
  }

  // ---- Dev-only user trust shim --------------------------------------------
  if (kind === "user") {
    if (!devTokensAllowed()) {
      return { error: { status: 401, code: "DEV_TOKENS_DISABLED", message: "dev user tokens are disabled; use a Bearer JWT" } };
    }
    const [tenantId, role] = (rest || "").split(":");
    if (!tenantId || !role) return { error: { status: 401, code: "UNAUTHENTICATED", message: "bad user token" } };
    return { principal: { tenantId, principalType: "user", role, scopes: roleScopes(role), actor: `user:${role}` } };
  }

  // ---- Client-credentials: svc client_id:secret ----------------------------
  if (kind === "svc") {
    const [clientId, secret] = (rest || "").split(":");
    if (!clientId || !secret) return { error: { status: 401, code: "UNAUTHENTICATED", message: "bad service token" } };
    // SECURITY DEFINER lookup: resolves the client before the tenant is known
    // (cannot be tenant-RLS-scoped). Read-only, by client_id only.
    const row = await withClaimsAdmin(async (client) => {
      const r = await client.query("select * from dispatch.lookup_service_client($1)", [clientId]);
      return r.rows[0];
    });
    if (!row || !row.active) return { error: { status: 401, code: "INVALID_CLIENT", message: "unknown or inactive client" } };
    if (!timingSafeStrEqual(row.secret_hash, hashSecret(secret))) {
      return { error: { status: 401, code: "INVALID_CLIENT", message: "bad secret" } };
    }
    return { principal: { tenantId: row.tenant_id, principalType: "service", role: "service", scopes: row.scopes, actor: `svc:${clientId}` } };
  }

  return { error: { status: 401, code: "UNAUTHENTICATED", message: "unknown token kind" } };
}

// Verify and map a Bearer JWT to a Principal.
function resolveJwt(token) {
  let header;
  try {
    header = decodeUnverified(token);
  } catch {
    return { error: { status: 401, code: "UNAUTHENTICATED", message: "malformed bearer token" } };
  }
  const isService = header.principal_type === "service";
  const secret = isService ? process.env.DISPATCH_TOKEN_SECRET : process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    return { error: { status: 401, code: "AUTH_NOT_CONFIGURED", message: `${isService ? "DISPATCH_TOKEN_SECRET" : "SUPABASE_JWT_SECRET"} not set` } };
  }
  let claims;
  try {
    claims = verifyJwt(token, secret, { issuer: process.env.DISPATCH_TOKEN_ISSUER || undefined });
  } catch (e) {
    const code = e instanceof JwtError && e.code === "EXPIRED" ? "TOKEN_EXPIRED" : "INVALID_TOKEN";
    return { error: { status: 401, code, message: e.message } };
  }
  const tenantId = claims.tenant_id || claims.app_metadata?.tenant_id;
  if (!TENANT_RE.test(tenantId ?? "")) {
    return { error: { status: 401, code: "UNAUTHENTICATED", message: "token has no valid tenant_id" } };
  }
  if (isService) {
    return { principal: { tenantId, principalType: "service", role: "service", scopes: claims.scopes ?? [], actor: `svc:${claims.client_id || claims.sub || "service"}` } };
  }
  const role = claims.dispatch_role || claims.role || "viewer";
  return { principal: { tenantId, principalType: "user", role, scopes: claims.scopes ?? roleScopes(role), actor: `user:${role}` } };
}

/**
 * Mint a short-lived Dispatch service JWT from a verified service principal.
 * Backs POST /v1/token (client-credentials → bearer token).
 */
export function mintServiceToken(principal) {
  const secret = process.env.DISPATCH_TOKEN_SECRET;
  if (!secret) return { error: { status: 500, code: "AUTH_NOT_CONFIGURED", message: "DISPATCH_TOKEN_SECRET not set" } };
  const ttl = Number(process.env.DISPATCH_TOKEN_TTL_SEC || 900);
  const clientId = (principal.actor || "").replace(/^svc:/, "") || principal.clientId;
  const token = signJwt(
    { principal_type: "service", sub: clientId, client_id: clientId, tenant_id: principal.tenantId, scopes: principal.scopes ?? [] },
    secret,
    { expiresIn: ttl, issuer: process.env.DISPATCH_TOKEN_ISSUER || "sovereign-dispatch" },
  );
  return { token, tokenType: "Bearer", expiresIn: ttl };
}

export function roleScopes(role) {
  switch (role) {
    case "viewer": return ["dispatch:read"];
    case "author":
    case "tenant_admin": return ["dispatch:validate", "dispatch:render", "dispatch:read"];
    case "service": return ["dispatch:validate", "dispatch:render", "dispatch:read"];
    default: return [];
  }
}

export function hasScope(principal, scope) {
  return Array.isArray(principal.scopes) && principal.scopes.includes(scope);
}
