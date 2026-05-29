// Sovereign Dispatch — artifact storage abstraction (Epic 8, P1).
//
// Writes rendered artifact bytes to an object store and returns a storage ref +
// sha256. P1 default backend is the local filesystem (no external dependency,
// runs in CI and this environment); production swaps in Supabase Storage / S3
// behind the same putArtifact/getArtifact/signUrl interface.
//
//   DISPATCH_STORAGE_DIR   base dir for the fs backend (default: /tmp/dispatch-artifacts)
//
// Path convention mirrors the spec: tenant/{tid}/doc/{docId}/{versionId}/{artifactId}.{ext}

import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";

const BASE = process.env.DISPATCH_STORAGE_DIR || "/tmp/dispatch-artifacts";

export function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

export function artifactKey({ tenantId, documentId, versionId, artifactId, ext }) {
  return `tenant/${tenantId}/doc/${documentId}/${versionId}/${artifactId}.${ext}`;
}

/**
 * Write artifact bytes. Returns { storageRef, sha256, sizeBytes }.
 * Write-once: callers create a new artifactId per (re-)render.
 */
export async function putArtifact(key, bytes) {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const abs = join(BASE, key);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, buf);
  return { storageRef: key, sha256: sha256(buf), sizeBytes: buf.length };
}

export async function getArtifact(key) {
  return readFile(join(BASE, key));
}

export async function artifactExists(key) {
  try { await stat(join(BASE, key)); return true; } catch { return false; }
}

/**
 * Mint a retrieval URL for an artifact. The fs backend returns a file:// URL with
 * an expiry query param (no real signing); production returns a signed object-store
 * URL. TTL is capped to maxTtl; returns { url, expiresAt, capped }.
 */
export function signUrl(key, ttlSeconds = 604800, maxTtl = 2592000) {
  const ttl = Math.min(ttlSeconds, maxTtl);
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  return { url: `file://${join(BASE, key)}?expires=${encodeURIComponent(expiresAt)}`, expiresAt, capped: ttl < ttlSeconds };
}
