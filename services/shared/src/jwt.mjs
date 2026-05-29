// Sovereign Dispatch — minimal HS256 JWT (sign/verify) using node:crypto only.
// No external dependency (the sandbox/CI registry is restricted, and a JWT
// verifier must not become a supply-chain liability). Implements exactly what
// Dispatch needs: HS256 sign + verify with exp/nbf/iss checks and constant-time
// signature comparison. Production-grade primitives; not a general JOSE library.
//
// Used by auth.mjs to (a) verify Supabase user JWTs (HS256, SUPABASE_JWT_SECRET)
// and (b) mint+verify Dispatch service JWTs (HS256, DISPATCH_TOKEN_SECRET).

import { createHmac, timingSafeEqual } from "node:crypto";

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlJson = (obj) => b64url(JSON.stringify(obj));
const fromB64url = (s) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

export class JwtError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function sign256(signingInput, secret) {
  return b64url(createHmac("sha256", secret).update(signingInput).digest());
}

/**
 * Mint an HS256 JWT. `claims` are merged with iat/exp.
 * @param {object} claims
 * @param {string} secret
 * @param {{expiresIn?:number, issuer?:string}} [opts] expiresIn in seconds
 */
export function signJwt(claims, secret, opts = {}) {
  if (!secret) throw new JwtError("NO_SECRET", "signing secret not configured");
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now,
    ...(opts.expiresIn ? { exp: now + opts.expiresIn } : {}),
    ...(opts.issuer ? { iss: opts.issuer } : {}),
    ...claims,
  };
  const header = { alg: "HS256", typ: "JWT" };
  const signingInput = `${b64urlJson(header)}.${b64urlJson(payload)}`;
  return `${signingInput}.${sign256(signingInput, secret)}`;
}

/** Decode payload WITHOUT verifying the signature (e.g. to read principal_type). */
export function decodeUnverified(token) {
  const parts = String(token).split(".");
  if (parts.length !== 3) throw new JwtError("MALFORMED", "not a JWT");
  try {
    return JSON.parse(fromB64url(parts[1]).toString("utf8"));
  } catch {
    throw new JwtError("MALFORMED", "bad JWT payload");
  }
}

/**
 * Verify an HS256 JWT. Throws JwtError on any failure.
 * @returns the decoded, verified payload.
 */
export function verifyJwt(token, secret, opts = {}) {
  if (!secret) throw new JwtError("NO_SECRET", "verification secret not configured");
  const parts = String(token).split(".");
  if (parts.length !== 3) throw new JwtError("MALFORMED", "not a JWT");
  const [h, p, sig] = parts;

  let header;
  try {
    header = JSON.parse(fromB64url(h).toString("utf8"));
  } catch {
    throw new JwtError("MALFORMED", "bad JWT header");
  }
  if (header.alg !== "HS256") throw new JwtError("ALG", `unsupported alg: ${header.alg}`);

  const expected = sign256(`${h}.${p}`, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new JwtError("BAD_SIGNATURE", "signature verification failed");
  }

  const payload = JSON.parse(fromB64url(p).toString("utf8"));
  const now = Math.floor(Date.now() / 1000);
  const skew = opts.clockToleranceSec ?? 5;
  if (payload.exp != null && now > payload.exp + skew) throw new JwtError("EXPIRED", "token expired");
  if (payload.nbf != null && now + skew < payload.nbf) throw new JwtError("NOT_YET_VALID", "token not yet valid");
  if (opts.issuer && payload.iss !== opts.issuer) throw new JwtError("ISSUER", "unexpected issuer");
  return payload;
}
